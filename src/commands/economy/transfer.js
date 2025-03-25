const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transfer")
    .setDescription("Transfer money to a fellow gambler.")
    .addUserOption(opt =>
       opt.setName("payee")
             .setDescription("Who to pay the money to.")
             .setRequired(true))
    .addIntegerOption(opt =>
        opt.setName("amount")
            .setDescription("How much you want to pay.")
            .setMinValue(1)
            .setRequired(true)),
  execute: async inter => {
    const payee = inter.options.getUser("payee");
    const toPay = inter.options.getInteger("amount");
    let checkBal = await inter.client.datadb.getusr(inter.user.id, "bal");

   if ((checkBal - toPay) < 0) {
      await inter.reply({ content: "You cannot afford to transfer that much.", ephemeral: true });
      return;
   }

   if (inter.user.id == payee.id) {
    await inter.reply({ content: "You cannot transfer money to yourself.", ephemeral: true });
      return;
   }

    const confirmBut = new ButtonBuilder()
      .setCustomId("confirm")
      .setLabel(`Yes, pay money to ${payee.username}`)
      .setStyle(ButtonStyle.Danger);

    const cancelBut = new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("No, cancel the transfer")
      .setStyle(ButtonStyle.Secondary);

    const buts = new ActionRowBuilder().addComponents(confirmBut, cancelBut);

    const conf = await inter.reply({
      content: `Are you sure you want to transfer \`${toPay} ${inter.client.currency}\` to \`${payee.username}\`?`,
      components: [buts],
      ephemeral: true,
    });
    
    // make sure the payee has money
    await inter.client.datadb.udfltusr(payee.id);

    // make sure that only the person asking is responding (just to make sure, even though it's ephemeral)
    let userFilter = i => i.user.id === inter.user.id;
    
    try {
      let resp = await conf.awaitMessageComponent({ filter: userFilter, time: 30_000 });

      if (resp.customId === "confirm") {
        await inter.client.datadb.modusr(inter.user.id, "bal", -toPay);
        await inter.client.datadb.modusr(payee.id, "bal", toPay);
        await resp.update({ content: `You have transferred \`${toPay} ${inter.client.currency}\` to \`${payee.username}\`.`, components: [], ephemeral: true });
      } else if (resp.customId === "cancel") {
        await resp.update({ content: "Transfer cancelled.", components: [], ephemeral: true });
      }
    } catch (e) {
      console.log(e);
      await inter.editReply({ content: "Transfer cancelled - timed out after 30 seconds.", components: [], ephemeral: true });
    }
  }
}
