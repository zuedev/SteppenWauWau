export default {
  interactionData: {
    name: "karma",
    description: "Get your current Karma",
  },
  scopes: ["interaction", "mongocluster"],
  execute: async (interaction, mongocluster) => {
    let member = await mongocluster
      .db(process.env.MONGO_DB)
      .collection("karma")
      .findOne(
        { userId: interaction.member.id, guildId: interaction.guild.id },
        { projection: { karma: 1 } }
      );

    let karma = member ? member.karma : 0;

    interaction.reply(
      `Your karma in **${interaction.guild.name}** is: \`${karma || 0}\``
    );
  },
};
