import { Message } from 'discord.js';
import { canRunForGuild, markGuildRate } from './utils/globalRateGate';
import { SimpleCommandConfig } from './config/simpleCommands';

const { Command } = require('discord-akairo');

type ConfigurableCommandClass = new (...args: any[]) => InstanceType<typeof Command>;

type GlobalRateClient = {
  globalRates: Map<string, Set<string>>;
};

class ConfigurableCommand extends Command {
  private readonly config: SimpleCommandConfig;

  constructor(config: SimpleCommandConfig) {
    super(config.id, {
      aliases: config.trigger.aliases,
      regex: config.trigger.regex,
      cooldown: config.akairo?.cooldown,
      ratelimit: config.akairo?.ratelimit,
      category: config.akairo?.category,
    });

    this.config = config;
  }

  exec(message: Message): void {
    if (this.config.skipUserIds?.includes(message.author.id)) return;
    if (this.config.requireGuild && !message.guild) return;

    if (this.config.globalRate?.enabled) {
      if (!message.guild) return;

      const globalRateKey = this.config.globalRate.key || this.config.id;
      const globalRateTtlMs = this.config.globalRate.ttlMs;
      if (!globalRateTtlMs) return;

      const rateClient = this.client as unknown as GlobalRateClient;
      if (!canRunForGuild(rateClient, message.guild.id, globalRateKey)) return;
      markGuildRate(rateClient, message.guild.id, globalRateKey, globalRateTtlMs);
    }

    switch (this.config.response.type) {
      case 'text':
        if (this.config.response.reply) {
          message.reply(this.config.response.content);
          return;
        }
        message.channel.send(this.config.response.content);
        return;
      case 'embed':
        message.channel.send({ embeds: this.config.response.embeds });
        return;
      case 'file':
        message.channel.send({
          files: [{ attachment: this.config.response.path, name: this.config.response.name }],
        });
        return;
      case 'randomFile': {
        const item =
          this.config.response.items[Math.floor(Math.random() * this.config.response.items.length)];
        message.channel.send({
          files: [{ attachment: item.path, name: item.name }],
        });
        return;
      }
      case 'randomText': {
        const content =
          this.config.response.items[Math.floor(Math.random() * this.config.response.items.length)];
        if (this.config.response.reply) {
          message.reply(content);
          return;
        }
        message.channel.send(content);
        return;
      }
      default:
        return;
    }
  }
}

export const createConfigurableCommandClasses = (
  configs: SimpleCommandConfig[],
): ConfigurableCommandClass[] => {
  return configs.map(
    (config) =>
      class extends ConfigurableCommand {
        constructor() {
          super(config);
        }
      },
  );
};
