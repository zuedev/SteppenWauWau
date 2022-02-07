import "dotenv/config";
import { Client, Intents } from "discord.js";
import { execSync } from "child_process";

const client = new Client({
  presence: {
    activities: [
      {
        name: "boot sequence logs",
        type: "WATCHING",
      },
    ],
  },
  intents: [],
  partials: ["REACTION"],
});

client.on("ready", () => {
  wakeUp();

  setInterval(mainInterval, 60000);
});

client.login(process.env.TOKEN);

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
      type: "PLAYING",
      name: "some indie horror game",
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
