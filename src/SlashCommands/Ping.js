export default {
  interactionData: {
    name: "ping",
    description: "A true game of wits and physical prowess.",
  },
  scopes: ["interaction"],
  execute: (interaction) => {
    interaction.reply("PONG! :ping_pong:");
  },
};
