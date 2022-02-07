import { MessageEmbed } from "discord.js";

export default {
  interactionData: {
    name: "createevent",
    description: "Create an event",
    options: [
      {
        name: "name",
        type: "STRING",
        description: "Name of the event",
        required: true,
      },
      {
        name: "time",
        type: "STRING",
        description: "Starting time of the event in UTC (YYMMDDhhmm)",
        required: true,
      },
      {
        name: "description",
        type: "STRING",
        description: "Description of the event",
      },
      {
        name: "image_url",
        type: "STRING",
        description: "URL of the big image you want to use for the event.",
      },
    ],
  },
  scopes: ["interaction", "mongocluster"],
  execute: async (interaction, mongocluster) => {
    if (!interaction.member.permissions.has("ADMINISTRATOR"))
      return interaction.reply("Only admins can do that");
    if (!interaction.options.get("time").value.match(/^\d+$/))
      return interaction.reply("The `time` argument can only be numbers!");
    if (interaction.options.get("time").value.length !== 10)
      return interaction.reply("The `time` argument must have 10 numbers!");

    let messageEmbed = new MessageEmbed({
      title: interaction.options.get("name").value,
      fields: [
        {
          name: "Event Start",
          value: (() => {
            let arr = interaction.options.get("time").value.match(/.{1,2}/g);
            arr[0] = "20" + arr[0];
            arr[1] = arr[1] - 1;
            let newDate = new Date(Date.UTC(...arr)).getTime() / 1000;
            return `<t:${newDate}:F> <t:${newDate}:R>`;
          })(),
        },
        {
          name: "Participants",
          value: "None",
        },
      ],
      description: interaction.options.get("description")
        ? interaction.options.get("description").value
        : "",
      image: {
        url: interaction.options.get("image_url")
          ? interaction.options.get("image_url").value
          : "",
      },
      color: "RANDOM",
      author: {
        name: interaction.user.tag,
        iconURL: interaction.user.avatarURL(),
      },
      footer: {
        text: "React with a 🟩 to show you're attending!",
      },
    });

    interaction.reply("Event created");
    interaction.channel
      .send({ content: "@everyone", embeds: [messageEmbed] })
      .then((message) => {
        mongocluster
          .db(process.env.MONGO_DB)
          .collection("events")
          .insertOne({ messageId: message.id, channelId: message.channel.id });
        message.react("🟩");
        let collector = message.createReactionCollector({
          dispose: true,
          filter: (reaction, user) => reaction.emoji.name === "🟩" && !user.bot,
        });
        collector.on("collect", (reaction, user) =>
          participantsHandler(reaction, user, "collect")
        );
        collector.on("remove", (reaction, user) =>
          participantsHandler(reaction, user, "remove")
        );
        interaction.deleteReply();
      });
  },
  participantsHandler: participantsHandler,
};

function participantsHandler(reaction, user, method) {
  if (method === "collect") {
    const oldStuff = reaction.message.embeds[0].fields[1].value;
    let newStuff = reaction.message.embeds[0];

    if (oldStuff === "None") {
      newStuff.fields[1].value = `<@${user.id}>`;
    } else {
      newStuff.fields[1].value = newStuff.fields[1].value + `\n<@${user.id}>`;
    }
    reaction.message.edit({ embeds: [newStuff] });
  } else if (method === "remove") {
    const oldStuff = reaction.message.embeds[0].fields[1].value;
    let newStuff = reaction.message.embeds[0];

    let userArray = oldStuff.split("\n");
    let arrayIndex = userArray.indexOf(`<@${user.id}>`);
    userArray.splice(arrayIndex, 1);

    if (userArray.length > 0) {
      let updatedParticipants = "";
      for (let participant of userArray) {
        updatedParticipants += `\n${participant}`;
      }
      newStuff.fields[1].value = updatedParticipants;
    } else {
      newStuff.fields[1].value = "None";
    }

    reaction.message.edit({ embeds: [newStuff] });
  }
}
