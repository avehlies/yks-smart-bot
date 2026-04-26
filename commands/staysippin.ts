import { Message } from 'discord.js';

const { Command } = require('discord-akairo');
const { random } = require('lodash');


const STAYSIPPIN_ENTRIES = [
  {
    description: 'jf.jpg',
    image: `${__dirname}/../assets/staysippin/jf.jpg`,
  },
  {
    description: 'jf-time-magazine.png',
    image: `${__dirname}/../assets/staysippin/jf-time-magazine.png`,
  },
  {
    description: 'youngonion.png',
    image: `${__dirname}/../assets/staysippin/YoungOnion.png`,
  },
  {
    description: 'heycraisins.jpg',
    image: `${__dirname}/../assets/staysippin/heycraisins.jpg`,
  },
  {
    description: 'mrs-craisins.jpg',
    image: `${__dirname}/../assets/staysippin/mrs-craisins.jpg`,
  }
];

class StaySippinCommand extends Command {
  constructor() {
    super('staysippin', {
      aliases: ['staysippin', 'staysipping', 'twodrinks'],
      ...({
        cooldown: 1000 * 60,
        ratelimit: 4,
      }),
    });
  }
  

  exec(message: Message) {
    console.log('staysippin command executed on message:', message);
    if (!message.guild) return;
    console.log('message.guild', message.guild);
    if (!this.client.globalRates.get(message.guild.id)) {
      this.client.globalRates.set(message.guild.id, new Set());
    }

    if (!this.client.globalRates.get(message.guild.id).has('staysippin')) {
      this.client.globalRates.get(message.guild.id).add('staysippin');
      const self = this;
      setTimeout(function () {
        self.client.globalRates.get(message.guild!.id).delete('staysippin');
      }, 1000 * 60); // once per min

      const entry = STAYSIPPIN_ENTRIES[random(STAYSIPPIN_ENTRIES.length - 1)];
      message.channel.send({ 
        files: [{
            attachment: entry.image,
            name: entry.description
        }],
      });
    }
  }
}

module.exports = StaySippinCommand;
