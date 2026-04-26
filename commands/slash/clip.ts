import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AutocompleteInteraction,
  ButtonInteraction,
  CommandInteraction,
  Message,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageEmbed,
  MessageInteraction,
} from 'discord.js';
import { CommandInterface } from '../../interfaces/command';
import YKSSmartBot from '../../bot';
import ClipsModel from '../../db/clips';

const commandName = 'findtheclimp';

function transcriptionSnippetAround (
  text: string,
  phrase: string,
  maxLen: number
): string {
  if (text.length <= maxLen) return text;
  if (!phrase.trim()) return text.substring(0, maxLen);

  const lower = text.toLowerCase();
  const idx = lower.indexOf(phrase.toLowerCase());
  if (idx === -1) return text.substring(0, maxLen);

  const center = idx + phrase.length / 2;
  let start = Math.floor(center - maxLen / 2);
  start = Math.max(0, Math.min(start, text.length - maxLen));

  let result = text.substring(start, start + maxLen);
  if (start > 0) {
    result = "..." + result;
  }
  if (start + maxLen < text.length) {
    result = result + "...";
  }
  return result;
};

function sliceMap<K, V>(map: Map<K, V>, start: number, end: number): Map<K, V> {
  const result = new Map<K, V>();
  let i = 0;
  for (const entry of map) {
    if (i >= start && i < end) {
      result.set(entry[0], entry[1]);
    }
    if (i >= end) break;
    i++;
  }
  return result;
}

const clipsCommand: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName(commandName)
    .setDescription('Looking for the Climp')
    .addStringOption((option) =>
      option
        .setName('search')
        .setDescription('Phrase to search for')
        .setAutocomplete(true)
        .setRequired(true),
    ),

  autocomplete: async (client: YKSSmartBot, interaction: AutocompleteInteraction) => {
    try {
      const searchPhrase = interaction.options.getString('search');
      if (!searchPhrase || searchPhrase.length < 3) {
        return interaction.respond([{ name: 'Enter a search term.', value: '' }]);
      }

      /*
      // Escape regex special chars so e.g. "what?" doesn't break the query
      const escaped = searchPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const results = await ClipsModel.find({
        transcription: {
          $exists: true,
          $regex: escaped,
          $options: 'i',
        },
      });
      */

      const results = await ClipsModel.find({
        $text: { $search: searchPhrase },
        transcription: { $exists: true },
      })
      .sort({ score: { $meta: 'textScore' } });

      if (!results || results.length == 0) {
        return interaction.respond([{ name: 'No results.', value: '' }]);
      }

      const resultsHash = new Map();
      results.forEach((result) => {
        resultsHash.set(result.transcription?.toLowerCase(), result);
      });

      const data = sliceMap(resultsHash, 0, 20);

      const choices = Array.from(data.values()).map((result: any) => {
        const name = transcriptionSnippetAround(
          result.transcription,
          searchPhrase,
          94
        );
        // const name = result.transcription.substring(0, 94);
        return { name, value: result._id };
      });

      await interaction.respond(choices);
    } catch (e: any) {
      console.error(e);
    }
  },

  run: async (client: YKSSmartBot, interaction: CommandInteraction) => {
    await interaction.deferReply({ ephemeral: true, fetchReply: true });
    client.commandInteractions.push(interaction);
    const objectId = interaction.options.getString('search');
    if (typeof objectId !== 'string' || objectId.length !== 24) {
      return interaction.editReply({ content: 'Please wait for the autocomplete options!' });
    }

    const clip = objectId ? await ClipsModel.findOne({ _id: objectId }) : null;
    if (objectId && clip) {
      const msg = await interaction.channel?.messages.fetch(clip.id);
      if (msg && msg.attachments.size > 0) {
        const index = Math.floor(Math.random() * msg.attachments.size);
        const attachment = msg.attachments.at(index);
        if (attachment) {
          const url = attachment.proxyURL;
          return interaction.editReply({
            files: [url],
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setCustomId(`${commandName}-confirm-${objectId}-${index}`)
                  .setLabel('Post it')
                  .setStyle('SUCCESS'),
                new MessageButton()
                  .setCustomId(`${commandName}-reject`)
                  .setLabel(`Don't post it`)
                  .setStyle('DANGER'),
              ),
            ],
          });
        }
      }
    }

    return interaction.editReply({ content: 'Something went wrong.' });
  },

  handleButton: async (client: YKSSmartBot, interaction: ButtonInteraction) => {
    try {
      await interaction.deferUpdate();
      const [, confirmStr, objectIdStr, indexStr] = interaction.customId.split('-');
      const confirm = confirmStr === 'confirm';

      const original = client.commandInteractions.findIndex(
        (i) => i.id === interaction.message.interaction?.id,
      );

      const guild = client.util.resolveGuild(process.env.YKS_GUILD_ID!, client.guilds.cache);
      if (!guild) return;
      const channel = client.util.resolveChannel(
        process.env.YKS_CLIP_CHANNEL_ID!,
        guild.channels.cache,
      );
      if (!channel || !channel.isText()) return;

      if (confirm) {
        if (original >= 0) {
          await client.commandInteractions[original].editReply({
            content: 'Posted.',
            files: [],
            attachments: [],
            components: [],
          });
          client.commandInteractions.splice(original, 1);
        }
        if (typeof objectIdStr !== 'string' || objectIdStr.length !== 24) {
          return;
        }

        const clip = await ClipsModel.findOne({ _id: objectIdStr });
        if (clip) {
          const msg = await interaction.channel?.messages.fetch(clip.id);
          if (msg && msg.attachments.size > 0) {
            const attachment = msg.attachments.at(parseInt(indexStr));
            if (attachment) {
              const url = attachment.proxyURL;
              if (!url) return;

              return channel.send({
                files: [url],
                embeds: [
                  new MessageEmbed().setDescription(
                    `Requested by ${interaction.member?.user} using the \`/findtheclimp\` command.`,
                  ),
                ],
              });
            }
          }
        }
      } else {
        if (original >= 0) {
          await client.commandInteractions[original].editReply({
            content: `Didn't post. Is that a first for you?`,
            files: [],
            attachments: [],
            components: [],
          });
          client.commandInteractions.splice(original, 1);
        }
        return;
      }
    } catch {}
  },
};

export default clipsCommand;
