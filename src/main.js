import "dotenv/config";
import { Client, Intents } from "discord.js";
import Mongo from "mongodb";
import { execSync } from "child_process";
import SlashCommands from "./SlashCommands/_index.js";
import Config from "./config.js";

const client = new Client({
  intents: new Intents([...Object.keys(Intents.FLAGS)]),
  partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"],
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
  reinitExistingCollectors();
  setInterval(mainInterval, 60000);
  wakeUp();
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("¬") && !message.content.startsWith("¬ ")) {
    const commandArray = message.content.substring(1).split(" ");
    const command = commandArray.shift();
    const args = commandArray;

    switch (command) {
      case "owner-announcement":
        doOwnerAnnouncementCommand(message, args.join(" ").trim());
        break;
      case "load-default-karma-emoji":
        doLoadDefaultKarmaEmojiCommand(message);
        break;
      default:
        message.react("🤔").then(message.reply("Command not recognised!"));
        break;
    }
  }
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

function doLoadDefaultKarmaEmojiCommand(message) {
  if (message.guild === null)
    return message.reply("You can only do that in a guild you own! :O");
  if (message.author.id !== message.guild.ownerId)
    return message.reply("You're not the guild owner! >:(");

  try {
    for (const key in Config.emoji) {
      if (Config.emoji[key].default) {
        message.guild.emojis.create(
          `src/Assets/defaultEmoji/${Config.emoji[key].fileName}`,
          key
        );
      }
    }
    message.reply("Default karma emoji has been loaded! :D");
  } catch (error) {
    message.reply(
      "Something went wrong... Please make sure you have 4 normal emoji and 2 animated emoji slots available!"
    );
    try {
      for (const key in Config.emoji) {
        if (Config.emoji[key].default) {
          message.guild.emojis.cache.find((e) => e.name === key).delete();
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
}

async function doOwnerAnnouncementCommand(message, announcementText) {
  if (
    message.author.id !== "723361818940276736" ||
    announcementText.length === 0
  )
    return;

  client.guilds.cache.array().forEach((guild) => {
    guild
      .fetchOwner({ force: true })
      .then((owner) => owner.send(announcementText));
  });
}

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
    client.guilds
      .fetch(process.env.DEV_SERVER_ID)
      .then((guild) => guild.commands.set(commandsList));
  } else {
    client.application.commands.set(commandsList);
  }
}

function reinitExistingCollectors() {
  mongocluster
    .db(process.env.MONGO_DB)
    .collection("events")
    .find({
      messageId: { $exists: true },
    })
    .toArray()
    .then((array) => {
      let createEvent = SlashCommands.find(
        (e) => e.interactionData.name === "createevent"
      );

      array.forEach((event) => {
        client.channels
          .fetch(event.channelId)
          .then((channel) =>
            channel.messages.fetch(event.messageId).then((message) => {
              let collector = message.createReactionCollector({
                dispose: true,
                filter: (reaction, user) =>
                  reaction.emoji.name === "🟩" && !user.bot,
              });
              collector.on("collect", (reaction, user) =>
                createEvent.participantsHandler(reaction, user, "collect")
              );
              collector.on("remove", (reaction, user) =>
                createEvent.participantsHandler(reaction, user, "remove")
              );
            })
          )
          .catch((e) => {
            mongocluster
              .db(process.env.MONGO_DB)
              .collection("events")
              .findOneAndDelete({ messageId: event.messageId });
          });
      });
    });
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
    {
      type: "COMPETING",
      name: "to be the best boi",
    },
    {
      type: "STREAMING",
      name: "HOT TUB STREAM NO CLICKBAIT",
    },
    {
      type: "LISTENING",
      name: "The Communist Manifesto",
    },
    {
      type: "WATCHING",
      name: "International War Crimes",
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

  sendMessageToApplicationOwner(`I'm awake! Running version \`${commitHash}\``);
}

function sendMessageToApplicationOwner(message) {
  client.application.fetch().then((app) => app.owner.send(message));
}
