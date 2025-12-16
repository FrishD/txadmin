const modulename = 'DiscordBot:cmd:pctop';
import { CommandInteraction, EmbedBuilder } from 'discord.js';
import { embedder } from '../discordHelpers';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

export default async (interaction: CommandInteraction) => {
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 604800;
    const reports = txCore.database.getDboRef().data.pcReports.filter(report => report.timestamp > sevenDaysAgo);

    if (!reports.length) {
        return await interaction.reply(embedder.info('No PC reports found in the last 7 days.'));
    }

    const reporterCounts: { [reporter: string]: number } = {};
    for (const report of reports) {
        if (!reporterCounts[report.reporter]) {
            reporterCounts[report.reporter] = 0;
        }
        reporterCounts[report.reporter]++;
    }

    const sortedReporters = Object.entries(reporterCounts).sort((a, b) => b[1] - a[1]);

    const embed = new EmbedBuilder({
        title: 'Top PC Checkers (Last 7 Days)',
        color: 0x4262e2,
        timestamp: new Date(),
    });

    for (const [reporter, count] of sortedReporters) {
        embed.addFields({ name: reporter, value: `${count} reports`, inline: true });
    }

    return await interaction.reply({ embeds: [embed] });
};
