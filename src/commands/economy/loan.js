const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loan")
    .setDescription("Manage your loans.")
    .addSubcommand(subcom =>
        subcom.setName("borrow")
          .setDescription("Borrow some money.")
          .addIntegerOption(opt =>
            opt.setName("amount")
              .setDescription("Amount of money to borrow.")
              .setMinValue(1)
              .setRequired(true)))
    .addSubcommandGroup(grp =>
        grp.setName("payoff")
          .setDescription("Pay off your debt.")
          .addSubcommand(subcom =>
            subcom.setName("amount")
              .setDescription("Pay off a specific amount of debt.")
              .addIntegerOption(opt =>
                opt.setName("amount")
                  .setDescription("Amount of debt to pay off.")
                  .setMinValue(100)
                  .setRequired(true)))
        .addSubcommand(subcom =>
            subcom.setName("all")
              .setDescription("Pay off all your debt (does not work if you can't afford it)."))),
  execute: async inter => {
    // force zero debt if non-existent
    // inter.client.datadb.vdfltusr(inter.user.id, "debt", 0);

    switch (inter.options.getSubcommand()) {
    case "borrow":
      let loanAmount = inter.options.getInteger("amount");

      if (loanAmount > (await inter.client.datadb.getconf(inter.guildId, "loanpool") / 2)) {
        await inter.reply({
          content: `Error: You have not been approved to loan ${inter.client.currency}${loanAmount}.`,
          ephemeral: false,
        });
        return;
      }

      let deb = await inter.client.datadb.getusr(inter.user.id, "debt");
      if (deb) {
        await inter.reply({
          content: `Error: You have not been approved for a loan as you still have outstanding debt of \`${inter.client.currency}${deb}\`.`,
          ephemeral: true,
        });
        return;
      }


      const confirmBut = new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Yes, borrow money")
        .setStyle(ButtonStyle.Primary);

      const cancelBut = new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("No, cancel my loan application")
        .setStyle(ButtonStyle.Secondary);

      const buts = new ActionRowBuilder().addComponents(confirmBut, cancelBut);

      const conf = await inter.reply({
        content: `Are you sure you want to borrow \`${inter.client.currency}${loanAmount}\` at \`20%\` interest?`,
        components: [buts],
        ephemeral: true,
      });
      
      // make sure that only the person asking is responding (just to make sure, even though it's ephemeral)
      let userFilter = i => i.user.id === inter.user.id;
      
      try {
        let resp = await conf.awaitMessageComponent({ filter: userFilter, time: 30_000 });

        if (resp.customId === "confirm") {
          await inter.client.datadb.modusr(inter.user.id, "bal", loanAmount);
          await inter.client.datadb.modusr(inter.user.id, "debt", Math.ceil(loanAmount * 1.2));
          await inter.client.datadb.modconf(inter.guildId, "loanpool", -loanAmount);
          await resp.update({ content: `You have created a loan for \`${inter.client.currency}${loanAmount}\`. Your debt has been adjusted accordingly.\nYou can view your debt using the \`/balance\` command.`, components: [], ephemeral: true });
        } else if (resp.customId === "cancel") {
          await resp.update({ content: "Loan cancelled.", components: [], ephemeral: true });
        }
      } catch (_) {
        await inter.editReply({ content: "Loan cancelled - timed out after 30 seconds.", components: [], ephemeral: true });
      }
      break;
    case "all":
    case "amount":
      let totalDebt = await inter.client.datadb.getusr(inter.user.id, "debt"); 
      let totalmoney = await inter.client.datadb.getusr(inter.user.id, "bal"); 
      let toPay = inter.options.getSubcommand() === "all" ? totalDebt : inter.options.getInteger("amount");

      if (toPay > totalDebt) {
        await inter.reply({ content: "Error: You cannot pay off more debt than you have.", ephemeral: true });
        return;
      }

      if (toPay > totalmoney) {
        await inter.reply({ content: "Error: You cannot pay off more debt than you can afford.", ephemeral: true });
        return;
      }

      await inter.client.datadb.modconf(inter.guildId, "loanpool", toPay);
      await inter.client.datadb.modusr(inter.user.id, "debt", -toPay);
      await inter.client.datadb.modusr(inter.user.id, "bal", -toPay);
      await inter.reply({ content: `Successfully paid off \`${inter.client.currency}${toPay}\` of debt.`, ephemeral: true });
      break;
    default:
      await inter.reply({
        content: inter.options.getSubcommand(),
      });
      break;
    }
  }
}
