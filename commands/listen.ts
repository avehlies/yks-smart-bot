import { Message } from 'discord.js';

const { Command } = require('discord-akairo');
const Parser = require('rss-parser');
const parser = new Parser();
const MAIN_FEED_RSS = process.env.MAIN_FEED_RSS;
const {
  joinVoiceChannel,
  AudioPlayerStatus,
  createAudioResource,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const prettyMilliseconds = require('pretty-ms');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

async function removeTempFile(filePath: string | undefined) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // ignore
  }
}

class ListenCommand extends Command {
  constructor() {
    super('listen', {
      aliases: ['listen'],
      args: [
        {
          id: 'action',
          type: 'string',
          default: 'play',
        },
        {
          id: 'episode',
          type: 'content',
          default: '0',
        },
      ],
    });
  }

  async exec(message: Message, { action, episode }: { action: string; episode: string | number }) {
    if (!message.guild || !message.member) return;

    let respond = async (response: any) => {
      if (this.client.listen.response) {
        this.client.listen.response.edit(response).catch(() => {});
      } else if (this.client.listen.message) {
        this.client.listen.response = await this.client.listen.message
          .reply(response)
          .catch(() => null);
      }
    };

    if (
      action !== 'play' &&
      action !== 'random' &&
      action !== 'url' &&
      this.client.listen.player.state.status === AudioPlayerStatus.Idle
    ) {
      return message.channel.send('Nothing playing.');
    }

    if (action !== 'url') {
      episode = parseInt(episode as string);
    }

    if (this.client.listen.player.state.status !== AudioPlayerStatus.Idle) {
      switch (action) {
        case 'random':
        case 'url':
          return respond('Stop the current episode first.');

        case 'play':
          if (
            this.client.listen.player.state.status === AudioPlayerStatus.Paused ||
            this.client.listen.player.state.status === AudioPlayerStatus.AutoPaused
          ) {
            if (episode === 0) {
              // No arg passed
              this.client.listen.player.unpause();
              return;
            }
          }
          return respond('Stop the current episode first.');

        case 'pause':
          this.client.listen.player.pause();
          return;

        case 'stop':
          this.client.listen.player.stop(true);
          return;

        default:
          return respond('Not a valid option for the command `!listen`.');
      }
    }

    let mainFeed = await parser
      .parseURL(MAIN_FEED_RSS)
      .catch((e: any) => console.error('Failed to parse main feed RSS: ', e.message));

    // Sometimes bonus episodes and other things get released into the main feed
    // We need to filter those out.
    mainFeed = mainFeed.items.filter((ep: any) => ep.title.match(/ [0-9]+:/));
    // url: "https://<path>.mp3"
    // length: "<milliseconds>"
    // type: "audio/mpeg"
    let ep = mainFeed[0];
    if (action === 'random') {
      episode = Math.floor(Math.random() * mainFeed.length);
      // Episode 101 doesn't exist.
      if (episode > 100) episode++;
    } else if (action === 'url') {
      ep = {
        enclosure: { url: episode },
        title: `Episode 1: ${episode}`,
        itunes: { duration: '1:00' },
      };
    }

    if (typeof episode === 'number' && episode > 0) {
      const mainArray = mainFeed[0].title.split(':');
      const latestEpNum = Number(mainArray[0].trim().split(' ')[1]);
      if (episode > latestEpNum) {
        ep = null;
      }
      const item = mainFeed.find((ep: any, idx: number) => {
        return ep.title.includes(` ${episode}:`);
      });
      if (item) {
        ep = item;
      } else {
        ep = null;
      }
    }
    if (!ep) {
      return message.channel.send(`Couldn't find episode ${episode}.`);
    }

    if (!message.member.voice.channel)
      return message.channel.send('Please join a voice channel first.');

    // Join the same channel as the member
    const channel = message.member.voice.channel;
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    // Attach listeners before play() so we don't miss Idle or error when resource ends immediately
    this.client.listen.player.on(AudioPlayerStatus.Idle, (oldState: any, newState: any) => {
      if (oldState.status === newState.status) return;
      clearInterval(this.client.listen.interval);
      if (!this.client.listen._errorAlreadyResponded) {
        const duration = this.client.listen.player.state.playbackDuration ?? 0;
        if (duration < 2000) {
          respond('Playback failed to start (stream may be unavailable or invalid).').catch(() => {});
        } else {
          respond('Finished playing episode.').catch(() => {});
        }
      }
      removeTempFile(this.client.listen._tempFilePath);
      this.client.listen._tempFilePath = undefined;
      this.client.listen.connection?.destroy();
      this.client.listen.connection = null;
      this.client.listen.player.removeAllListeners();
      this.client.listen.embed = null;
      this.client.listen.message = null;
      this.client.listen.response = null;
      this.client.listen._errorAlreadyResponded = undefined;
    });

    this.client.listen.player.on(AudioPlayerStatus.Paused, (oldState: any, newState: any) => {
      if (oldState.status === newState.status) return;
      respond(`Paused at ${prettyMilliseconds(newState.playbackDuration)}.`).catch(() => {});
    });

    this.client.listen.player.on(AudioPlayerStatus.Buffering, () => {});

    this.client.listen.player.on(AudioPlayerStatus.Playing, (oldState: any, newState: any) => {
      if (oldState.status === newState.status) return;
      if (
        oldState.status === AudioPlayerStatus.Paused ||
        oldState.status === AudioPlayerStatus.AutoPaused
      ) {
        respond('Resuming.').catch(() => {});
      }
    });

    this.client.listen.player.on('error', (err: Error & { resource?: { playbackDuration?: number } }) => {
      const isAborted =
        err.message?.toLowerCase().includes('aborted') ||
        (err as NodeJS.ErrnoException).code === 'ECONNRESET';
      if (isAborted && (err.resource?.playbackDuration ?? 0) > 0) {
        console.warn('Audio stream closed (often happens when pausing a live stream):', err.message);
        this.client.listen._errorAlreadyResponded = true;
        respond('Playback stopped (stream connection closed). Pausing while streaming can cause this.').catch(
          () => {},
        );
      } else {
        console.error('Audio player error:', err);
        this.client.listen._errorAlreadyResponded = true;
        respond('Playback error.').catch(() => {});
      }
      removeTempFile(this.client.listen._tempFilePath);
      this.client.listen._tempFilePath = undefined;
    });

    try {
      console.info(`Joining voice channel ${channel.name}...`);
      await entersState(connection, VoiceConnectionStatus.Ready, 30000);
      console.info(`Voice channel ${channel.name} joined successfully.`);
      this.client.listen.connection = connection;
      this.client.listen.connection.subscribe(this.client.listen.player);
      console.info(`Subscribed to player.`);

      // Download to temp file so pause/resume works (no live stream to close)
      const audioUrl = ep.enclosure.url;
      const tempFilePath = path.join(
        os.tmpdir(),
        `yks-listen-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}.tmp`,
      );
      this.client.listen._tempFilePath = tempFilePath;

      await message.reply('Downloading episode...').catch(() => {});

      try {
        const { data } = await axios.get(audioUrl, {
          responseType: 'stream',
          timeout: 60000,
          headers: { 'User-Agent': 'YKS-Smart-Bot/1 (Podcast listener)' },
          validateStatus: (status: number) => status >= 200 && status < 400,
        });
        const writeStream = fs.createWriteStream(tempFilePath);
        await pipeline(data, writeStream);
      } catch (downloadErr: any) {
        console.error('Failed to download audio:', downloadErr.message);
        removeTempFile(tempFilePath);
        this.client.listen._tempFilePath = undefined;
        await message.channel.send('Could not download audio. Check bot logs.');
        connection.destroy();
        this.client.listen.connection = null;
        this.client.listen.player.removeAllListeners();
        return;
      }

      const resource = createAudioResource(tempFilePath, {
        inputType: StreamType.Arbitrary,
      });
      console.info('Playing from local file...');
      this.client.listen.player.play(resource);
    } catch (e) {
      message.channel.send('Failed to join the voice channel').catch(() => {});
      removeTempFile(this.client.listen._tempFilePath);
      this.client.listen._tempFilePath = undefined;
      connection?.destroy();
      this.client.listen.connection = null;
      this.client.listen.player.removeAllListeners();
      console.error(e);
    }

    const epNum = ep.title.match(/Episode [0-9]+/i);
    let epTitle =
      ep.title.substring(0, epNum.index) +
      ep.title
        .substring(epNum.index + epNum[0].length)
        .split(':')
        .join(' ');

    const duration =
      1000 *
      ep.itunes.duration.split(':').reduce((totalMs: string, curr: string) => {
        return Number(totalMs) * 60 + Number(curr);
      });
    let progressStr = '------------------------';
    let mainEmbed = {
      color: 0x83c133,
      title: `Now playing in ${message.member.voice.channel.name}`,
      author: {
        icon_url:
          'https://content.production.cdn.art19.com/images/c8/38/41/df/c83841df-2683-4baf-8959-28a8e7d66774/3e98f6d3fffcf5ebd7e02df5609cfe5fe9997e62f24382a26649e59061a6d029a0e16417689b0ccd00f7fc7638344abe1f61bc8d9e3c7235e4e60f43efec8c38.jpeg',
        url: 'https://art19.com/shows/your-kickstarter-sucks',
      },
      thumbnail: {
        url: 'https://content.production.cdn.art19.com/images/c8/38/41/df/c83841df-2683-4baf-8959-28a8e7d66774/3e98f6d3fffcf5ebd7e02df5609cfe5fe9997e62f24382a26649e59061a6d029a0e16417689b0ccd00f7fc7638344abe1f61bc8d9e3c7235e4e60f43efec8c38.jpeg',
      },
      fields: [
        {
          name: epNum[0],
          value: epTitle ? epTitle : '.',
          inline: false,
        },
        {
          name: `Progress (${prettyMilliseconds(0, {
            colonNotation: true,
          })} / ${prettyMilliseconds(duration, { colonNotation: true })})`,
          value: '|' + '🟢' + progressStr + '|',
          inline: false,
        },
      ],
    };

    this.client.listen.embed = mainEmbed;

    this.client.listen.message = await message.channel
      .send({ embeds: [mainEmbed] })
      .catch((err) => console.error(err));

    if (this.client.listen.message) {
      await this.client.listen.message.react('⏸').catch(() => {});
      await this.client.listen.message.react('⏹').catch(() => {});
      await this.client.listen.message.react('▶️').catch(() => {});
    }
    const listen = this.client.listen;
    this.client.listen.interval = setInterval(
      () => {
        if (!listen.embed?.fields) {
          clearInterval(listen.interval);
          return;
        }
        listen.embed.fields[1].name = `Progress (${prettyMilliseconds(
          listen.player.state.playbackDuration ? listen.player.state.playbackDuration : 0,
          { colonNotation: true },
        )} / ${prettyMilliseconds(duration, { colonNotation: true })})`;

        const progress = Math.ceil((100 * listen.player.state.playbackDuration) / duration / 4);

        listen.embed.fields[1].value =
          '\\|' +
          '||' +
          progressStr.substring(0, progress) +
          '||' +
          '🟢' +
          progressStr.substring(progress) +
          '\\|';
        if (listen.message) listen.message.edit({ embeds: [listen.embed] }).catch(() => {});
      },
      10 * 1000, // every 10 sec
      // @ts-ignore
      duration,
      progressStr,
      listen,
    );
  }
}

module.exports = ListenCommand;
