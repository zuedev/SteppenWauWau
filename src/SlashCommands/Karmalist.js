import { MessageEmbed } from "discord.js";

export default {
  interactionData: {
    name: "karmalist",
    description: "Get the list of best and worst karma",
    type: "STRING",
    options: [
      {
        name: "list",
        type: "STRING",
        description: "What list do you want to get?",
        required: true,
        choices: [
          {
            name: "Highest",
            value: "Highest",
          },
          {
            name: "Lowest",
            value: "Lowest",
          },
        ],
      },
      {
        name: "entries",
        type: "INTEGER",
        description: "How many entries should be returned? (default 5, max 25)",
      },
    ],
  },
  scopes: ["interaction", "mongocluster", "client"],
  execute: async (interaction, mongocluster, client) => {
    let leaderboard, returnLimit;

    if (interaction.options.some((e) => e.name === "entries")) {
      if (26 > interaction.options.get("entries").value > 0) {
        returnLimit = interaction.options.get("entries").value;
      } else {
        interaction.reply("You must choose an entry limit between 1-25");
        return;
      }
    } else {
      returnLimit = 5;
    }

    if (interaction.options.get("list").value === "Lowest") {
      leaderboard = (
        await mongocluster
          .db(process.env.MONGO_DB)
          .collection("karma")
          .find(
            { guildId: interaction.guild.id },
            {
              sort: { karma: 1 },
              projection: { userId: 1, karma: 1 },
              limit: returnLimit,
            }
          )
          .toArray()
      ).reverse();
    } else {
      leaderboard = await mongocluster
        .db(process.env.MONGO_DB)
        .collection("karma")
        .find(
          { guildId: interaction.guild.id },
          {
            sort: { karma: -1 },
            projection: { userId: 1, karma: 1 },
            limit: returnLimit,
          }
        )
        .toArray();
    }

    let embedData = {
      title: `${interaction.options.get("list").value} Karma for ${
        interaction.guild.name
      }`,
      fields: [],
      color: 0x7289da,
    };

    for (const mongoMember of leaderboard) {
      let user = await client.users.fetch(mongoMember.userId);
      embedData.fields.push({
        name: user.tag,
        value: mongoMember.karma.toString(),
      });
    }

    interaction.reply({ embeds: [new MessageEmbed(embedData)] });
  },
};
