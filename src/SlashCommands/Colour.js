const predefinedColours = {
  teal: "#1abc9c",
  aquamarine: "#2ecc71",
  blue: "#3498db",
  purple: "#9b59b6",
  hotpink: "#e91e63",
  yellow: "#f1c40f",
  orange: "#e67e22",
  patreonred: "#e74c3c",
  grey: "#95a5a6",
  gunmetal: "#607d8b",
  cyan: "#00ffff",
  brown: "#964b00",
};

function getDiscordRoleByName(roleName, guild) {
  return guild.roles.cache.find((r) => r.name === roleName);
}

export default {
  interactionData: {
    name: "colour",
    description: "Change your colour!",
    options: [
      {
        name: "colour",
        type: "STRING",
        description: "Pick a colour any colour except the ones we don't have",
        required: true,
        choices: (() => {
          let choicesArray = [];

          for (const key in predefinedColours) {
            choicesArray.push({
              name: key,
              value: key,
            });
          }

          return choicesArray;
        })(),
      },
    ],
  },
  scopes: ["interaction"],
  execute: async (interaction) => {
    const colourName = interaction.options.get("colour").value;
    const colourCode = predefinedColours[colourName];

    if (!getDiscordRoleByName(colourName, interaction.guild)) {
      await interaction.guild.roles.create({
        name: colourName,
        color: colourCode,
        permissions: [""],
      });
    }

    for (const key in predefinedColours) {
      if (
        await interaction.member.roles.cache.find((role) => role.name === key)
      ) {
        await interaction.member.roles.remove(
          await interaction.guild.roles.cache.find((role) => role.name === key)
        );
      }
    }

    await interaction.member.roles.add(
      getDiscordRoleByName(colourName, interaction.guild)
    );

    interaction.reply(`Your name is now **${colourName}**! ( ˘ ³˘)ノ°ﾟº❍｡`);
  },
};
