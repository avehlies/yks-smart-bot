export type CommandTrigger = {
  aliases?: string[];
  regex?: RegExp;
};

export type AkairoRateLimit = {
  cooldown?: number;
  ratelimit?: number;
  category?: string;
};

export type GlobalRateConfig = {
  enabled: boolean;
  key?: string;
  ttlMs?: number;
};

type TextResponse = {
  type: 'text';
  content: string;
  reply?: boolean;
};

type EmbedResponse = {
  type: 'embed';
  embeds: Array<Record<string, unknown>>;
};

type FileResponse = {
  type: 'file';
  path: string;
  name?: string;
};

type RandomFileResponse = {
  type: 'randomFile';
  items: Array<{
    path: string;
    name?: string;
  }>;
};

type RandomTextResponse = {
  type: 'randomText';
  items: string[];
  reply?: boolean;
};

export type CommandResponse =
  | TextResponse
  | EmbedResponse
  | FileResponse
  | RandomFileResponse
  | RandomTextResponse;

export type SimpleCommandConfig = {
  id: string;
  trigger: CommandTrigger;
  akairo?: AkairoRateLimit;
  globalRate?: GlobalRateConfig;
  response: CommandResponse;
  requireGuild?: boolean;
  skipUserIds?: string[];
};

const globalToday = new Date();
const shouldApplyMugCooldown = globalToday.getDate() !== 7 || globalToday.getMonth() !== 3;

export const simpleCommandConfigs: SimpleCommandConfig[] = [
  {
    id: 'feet',
    trigger: { aliases: ['feet'] },
    akairo: { cooldown: 3600000, ratelimit: 1 },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'Is that you, Quentin?', reply: true },
    requireGuild: true,
  },
  {
    id: 'fubfay',
    trigger: { regex: /^fubfay$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'fubfay', reply: true },
    requireGuild: true,
  },
  {
    id: 'garm',
    trigger: { regex: /^garm$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'garm', reply: true },
    requireGuild: true,
  },
  {
    id: 'gorb',
    trigger: { regex: /^gorb$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'gorb', reply: true },
    requireGuild: true,
  },
  {
    id: 'grog',
    trigger: { regex: /^grog$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'grog', reply: true },
    requireGuild: true,
  },
  {
    id: 'cunky',
    trigger: { regex: /^cunky$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'cunky', reply: true },
    requireGuild: true,
  },
  {
    id: 'bustard',
    trigger: { regex: /^bustard$/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'bustard', reply: true },
    requireGuild: true,
  },
  {
    id: 'cunch',
    trigger: { regex: /cunch/i },
    akairo: { cooldown: 3600000, ratelimit: 1, category: 'eater-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 3 },
    response: { type: 'text', content: 'cunch wrap supreme', reply: true },
    requireGuild: true,
  },
  {
    id: 'eve',
    trigger: { aliases: ['eve'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    globalRate: { enabled: true, ttlMs: 1000 * 60 },
    response: { type: 'text', content: 'Who?', reply: true },
    requireGuild: true,
  },
  {
    id: 'garth',
    trigger: { aliases: ['garth', 'slickstuff', 'coolstuff', 'rawstuff', 'neatstuff'] },
    akairo: { cooldown: 1000 * 60 * 60, ratelimit: 1 },
    response: {
      type: 'text',
      content:
        'https://cdn.discordapp.com/attachments/1108848589196775526/1118513877685116958/videoplayback_2.mp4',
    },
  },
  {
    id: 'barnes',
    trigger: { aliases: ['barnes'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    globalRate: { enabled: true, ttlMs: 1000 * 60 },
    response: { type: 'file', path: `${__dirname}/../../assets/barmes.jpg` },
    requireGuild: true,
  },
  {
    id: 'amogus',
    trigger: { aliases: ['amogus', 'frustrating'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 24 },
    response: {
      type: 'text',
      content:
        "Hey everybody, for real, playing to frustrate each other is not a fun way to play because we're all on the same team and that team is to have fun together and to make it fun for all our audiences. And so when people make plays just to frustrate each other and just to troll each other, there's enough of that in the world today, of people trolling each other just to be mean and to be hurtful, and if we're gonna play in this space together we need to do it because we want each other to have fun and not because we're trying to frustrate each other, cause there's enough frustrating things in the world right now and there's enough we can't control, and one of the things we can control is that everyone is here to have fun and not waste each others' time and so when we make decisions that are meant to troll each other, that's something that bad people do.",
    },
    requireGuild: true,
  },
  {
    id: 'bongo',
    trigger: { aliases: ['bongo'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: { type: 'text', content: 'https://ghostbongo.bigcartel.com' },
  },
  {
    id: 'bo',
    trigger: { aliases: ['bo'] },
    akairo: { cooldown: 1000 * 60 * 60, ratelimit: 1 },
    response: {
      type: 'text',
      content: '<@225822701132972034> can you handle this please.',
      reply: true,
    },
  },
  {
    id: 'crash',
    trigger: { aliases: ['crash', 'carcrash', 'rearend', 'rearended', 'dashcam'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: {
      type: 'text',
      content: 'https://www.youtube.com/watch?v=aTBHQXzt_C0&feature=youtu.be',
    },
  },
  {
    id: 'ftp',
    trigger: { aliases: ['ftp'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: {
      type: 'text',
      content:
        'https://discord.com/channels/641743927799447553/682325261978697732/1249099267927183391',
    },
  },
  {
    id: 'music',
    trigger: { aliases: ['music', 'soundtrack', 'songs', 'soundcloud'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: { type: 'text', content: 'https://soundcloud.com/ykspod' },
    requireGuild: true,
  },
  {
    id: 'sixpack',
    trigger: { aliases: ['sixpack', 'sixpacks', '6pack', '6packs', 'kaggle'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: { type: 'text', content: 'https://www.kaggle.com/officerbribe/yks-six-pack' },
    requireGuild: true,
  },
  {
    id: 'usenet',
    trigger: { aliases: ['usenet', 'stealing'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: {
      type: 'text',
      content:
        'https://discord.com/channels/641743927799447553/682325261978697732/1140406217836081222',
    },
  },
  {
    id: 'mailbag',
    trigger: { aliases: ['mailbag', 'address', 'pubox'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 1 },
    response: {
      type: 'embed',
      embeds: [
        {
          color: 0x83c133,
          title: 'P.U. Box',
          description: '540 W Main St #209\nGallatin, TN\n37066\nUSA',
          footer: {
            text: 'Remember to put an embarrassing name on the package',
          },
        },
      ],
    },
    requireGuild: true,
  },
  {
    id: 'sporange',
    trigger: { regex: /sporange/i },
    akairo: { cooldown: 28800000, ratelimit: 1, category: 'easter-egg' },
    globalRate: { enabled: true, ttlMs: 1000 * 60 * 60 * 24 * 7 },
    response: { type: 'text', content: "it's a new kind of orange", reply: true },
    requireGuild: true,
  },
  {
    id: 'staysippin',
    trigger: { aliases: ['staysippin', 'staysipping', 'twodrinks'] },
    akairo: { cooldown: 1000 * 60, ratelimit: 4 },
    globalRate: { enabled: true, ttlMs: 1000 * 60 },
    response: {
      type: 'randomFile',
      items: [
        { name: 'jf.jpg', path: `${__dirname}/../../assets/staysippin/jf.jpg` },
        {
          name: 'jf-time-magazine.png',
          path: `${__dirname}/../../assets/staysippin/jf-time-magazine.png`,
        },
        {
          name: 'youngonion.png',
          path: `${__dirname}/../../assets/staysippin/YoungOnion.png`,
        },
        {
          name: 'heycraisins.jpg',
          path: `${__dirname}/../../assets/staysippin/heycraisins.jpg`,
        },
        {
          name: 'mrs-craisins.jpg',
          path: `${__dirname}/../../assets/staysippin/mrs-craisins.jpg`,
        },
      ],
    },
    requireGuild: true,
  },
  {
    id: 'mug',
    trigger: { aliases: ['mug', 'burgymug'] },
    akairo: shouldApplyMugCooldown ? { cooldown: 1000 * 60 } : undefined,
    globalRate: { enabled: true, ttlMs: 1000 * 60 },
    response: {
      type: 'randomFile',
      items: [
        { path: `${__dirname}/../../assets/mug1.png` },
        { path: `${__dirname}/../../assets/mug2.jpg` },
        { path: `${__dirname}/../../assets/mug3.png` },
        { path: `${__dirname}/../../assets/mug4.jpg` },
        { path: `${__dirname}/../../assets/mug5.jpg` },
      ],
    },
    requireGuild: true,
  },
];
