import "dotenv/config";
import { Client, Intents } from "discord.js";
import Mongo from "mongodb";
import { execSync } from "child_process";
import SlashCommands from "./SlashCommands/_index.js";
import Config from "./config.js";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
  partials: ["MESSAGE", "REACTION"],
  presence: {
    activities: [
      {
        name: "boot sequence logs",
        type: "WATCHING",
      },
    ],
  },
});

const mongocluster = await Mongo.MongoClient.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

client.login(process.env.TOKEN);

client.on("ready", () => {
  registerSlashCommands();
  setInterval(mainInterval, process.env.MAIN_INTERVAL_TIME || 60000);
  wakeUp();
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  let command = SlashCommands.find((e) => {
    return e.interactionData.name === interaction.commandName;
  });

  command.execute(
    ...command.scopes.map((e) => {
      if (["interaction", "mongocluster", "client"].includes(e)) {
        return eval(e);
      }
    })
  );
});

client.on("messageReactionAdd", async (messageReaction, user) => {
  if (messageReaction.message.partial) await messageReaction.message.fetch();
  if (user.bot || user.id === messageReaction.message.member.id) return;

  let res = Config.emoji[messageReaction.emoji.name];

  if (res) updateKarma(messageReaction.message.member, res.karmaValue);
});

client.on("messageReactionRemove", async (messageReaction, user) => {
  if (messageReaction.message.partial) await messageReaction.message.fetch();
  if (user.bot || user.id === messageReaction.message.member.id) return;

  let res = Config.emoji[messageReaction.emoji.name];

  if (res) updateKarma(messageReaction.message.member, res.karmaValue * -1);
});

async function updateKarma(member, value) {
  await mongocluster
    .db(process.env.MONGO_DB)
    .collection("karma")
    .updateOne(
      { userId: member.id, guildId: member.guild.id },
      {
        $inc: { karma: value },
      },
      { upsert: true }
    );
}

function registerSlashCommands() {
  let commandsList = [];

  SlashCommands.forEach((command) => {
    commandsList.push(command.interactionData);
  });

  if (process.env.DEV_SERVER_ID) {
    client.application.commands.set([]);
    client.guilds
      .fetch(process.env.DEV_SERVER_ID)
      .then((guild) => guild.commands.set(commandsList));
  } else {
    client.application.commands.set(commandsList);
  }
}

function mainInterval() {
  const activities = [
    {
      type: "LISTENING",
      name: "UN radio chatter",
    },
    {
      type: "WATCHING",
      name: "pickle rick clips",
    },
  ];

  client.user.presence.set({
    activities: [activities[Math.floor(Math.random() * activities.length)]],
  });
}

function wakeUp() {
  const commitHash = execSync("git rev-parse HEAD").toString().trim();

  console.log(
    "Waking up...",
    JSON.stringify(
      {
        "client.user.tag": client.user.tag,
        "client.user.id": client.user.id,
        commitHash,
      },
      null,
      2
    )
  );
}
