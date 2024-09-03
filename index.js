const fs = require('fs');

let groups, exhibitions;

try {
	// Load and parse JSON files for groups and exhibition matches
	groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));
	exhibitions = JSON.parse(fs.readFileSync('exhibitions.json', 'utf-8'));
} catch (err) {
	// Handle error if JSON files can't be loaded
	console.error('Greška pri učitavanju JSON fajlova:', err.message);
	process.exit(1);
}

function calculateTeamForm(exhibitions, groups) {
	// Check if the groups or exhibitions data are undefined or null
	if (!groups || !exhibitions) {
		console.error('Greška: podaci o grupama ili prijateljskim utakmicama su undefined ili null.');
		return {};
	}

	const formScores = {};
	const allTeams = [];
	
	// Collect all teams from the groups to have a list of all participants
	for (const group of Object.values(groups)) {
		if (Array.isArray(group)) {
			allTeams.push(...group);
		} else {
			console.error('Neispravan format grupe:', group);
		}
	}

	// Calculate form score for each team based on exhibition matches
	for (const [team, matches] of Object.entries(exhibitions)) {
		let formScore = 0;
		matches.forEach(match => {
			// Parse match results and calculate the score difference
			const [teamScore, opponentScore] = match.Result.split('-').map(Number);
			const scoreDiff = teamScore - opponentScore;
			
			// Find the opponent and retrieve their ranking
			const opponent = allTeams.find(t => t.ISOCode === match.Opponent);
			const opponentRank = opponent ? opponent.FIBARanking : 10;
			
			// Update form score based on the match result and opponent's ranking
			formScore += scoreDiff + opponentRank / 100;
		});
		// Average the form score for the team
		formScores[team] = formScore / matches.length;
	}
	return formScores;
}

const formScores = calculateTeamForm(exhibitions, groups);

calculateTeamForm(exhibitions, groups);

function simulateMatch(team1, team2, formScores) {
	// Check if formScores is undefined
	if (!formScores) {
		console.error('Greška: formScores je undefined.');
		return {
			[team1.Team]: 0,
			[team2.Team]: 0,
		};
	}

	// Validate that both teams are defined
	if (!team1 || !team2) {
		console.error(`Greška: nevalidni timovi za simulaciju utakmice: ${team1 ? team1.Team : 'Nepoznato'} vs ${team2 ? team2.Team : 'Nepoznato'}`);
		return {
			[team1 ? team1.Team : 'Nepoznato']: 0,
			[team2 ? team2.Team : 'Nepoznato']: 0,
		};
	}

	// Ensure both teams have a form score; default to 0 if not available
	if (!(team1.Team in formScores)) {
		formScores[team1.Team] = 0;
	}

	if (!(team2.Team in formScores)) {
		formScores[team2.Team] = 0;
	}

	// Calculate the difference in ranking and form between the two teams
	const rank1 = team1.FIBARanking || 0;
	const rank2 = team2.FIBARanking || 0;
	const rankDiff = rank1 - rank2;

	const form1 = formScores[team1.Team] || 0;
	const form2 = formScores[team2.Team] || 0;
	const formDiff = form1 - form2;

	// Generate random scores for the match, adjusted by ranking and form differences
	const score1 = Math.floor(Math.random() * 50 + 75 + rankDiff + formDiff);
	const score2 = Math.floor(Math.random() * 50 + 75 - rankDiff - formDiff);

	// Check if the generated scores are valid numbers
	if (isNaN(score1) || isNaN(score2)) {
		console.error(`Greška u simulaciji utakmice između ${team1.Team} i ${team2.Team}: Nevalidni rezultati`);
		return {
			[team1.Team]: 0,
			[team2.Team]: 0,
		};
	}

	// Return the simulated scores for both teams
	return {
		[team1.Team]: score1,
		[team2.Team]: score2,
	};
}

function simulateGroupPhase(groups, formScores) {
	const results = {};
	const standings = {};
	const groupMatches = [];

	// Iterate over each group and its teams to simulate group phase matches
	for (const [group, teams] of Object.entries(groups)) {
		results[group] = [];
		// Initialize standings for each team in the group
		standings[group] = teams.map(team => ({
			Team: team.Team,
			Wins: 0,
			Losses: 0,
			Points: 0,
			Scored: 0,
			Conceded: 0,
			PointDiff: 0,
			Matches: []
		}));

		// For each team in the group, simulate matches against every other team
		for (let i = 0; i < teams.length; i++) {
			for (let j = i + 1; j < teams.length; j++) {
				const matchResult = simulateMatch(teams[i], teams[j], formScores);
				const team1 = standings[group].find(t => t.Team === teams[i].Team);
				const team2 = standings[group].find(t => t.Team === teams[j].Team);

				const team1Score = matchResult[teams[i].Team];
				const team2Score = matchResult[teams[j].Team];

				// Update team stats based on the match result
				team1.Scored += team1Score;
				team1.Conceded += team2Score;
				team1.PointDiff += (team1Score - team2Score);
				team1.Matches.push({
					opponent: team2.Team,
					score: team1Score,
					conceded: team2Score
				});

				team2.Scored += team2Score;
				team2.Conceded += team1Score;
				team2.PointDiff += (team2Score - team1Score);
				team2.Matches.push({
					opponent: team1.Team,
					score: team2Score,
					conceded: team1Score
				});

				// Determine the winner and update points and win/loss records
				if (team1Score > team2Score) {
					team1.Wins += 1;
					team1.Points += 2;
					team2.Losses += 1;
					team2.Points += 1;
				} else {
					team2.Wins += 1;
					team2.Points += 2;
					team1.Losses += 1;
					team1.Points += 1;
				}

				// Store the match result in the group's results and groupMatches arrays
				results[group].push({
					Team1: teams[i].Team,
					Team2: teams[j].Team,
					Score: `${team1Score}:${team2Score}`
				});

				groupMatches.push({
					team1: teams[i].Team,
					team2: teams[j].Team,
					score: `${team1Score}:${team2Score}`
				});
			}
		}

		// Sort teams within the group standings by points, then by point difference, and finally by head-to-head results
		standings[group].sort((a, b) => {
			if (b.Points !== a.Points) return b.Points - a.Points;
			const tiedTeams = standings[group].filter(t => t.Points === a.Points);
			if (tiedTeams.length === 3) {
				const pointDiffInRoundRobin = (team) => tiedTeams.reduce((diff, opponent) => {
					const match = team.Matches.find(m => m.opponent === opponent.Team);
					return diff + (match ? match.score - match.conceded : 0);
				}, 0);

				return pointDiffInRoundRobin(b) - pointDiffInRoundRobin(a);
			}

			const headToHeadMatch = a.Matches.find(m => m.opponent === b.Team);
			if (headToHeadMatch) {
				return headToHeadMatch.conceded - headToHeadMatch.score;
			}

			return 0;
		});
	}

	// Return the final results, standings, and group matches
	return {
		results,
		standings,
		groupMatches
	};
}

function displayGroupPhaseResults(results, standings) {
	// Display the results of all group phase matches
	console.log('\n\n======================================================');
	console.log('                  Group phase matches');
	console.log('======================================================');
	for (const [group, matches] of Object.entries(results)) {
		console.log(`\nGroup ${group}:`);
		console.log('+-------------------+-----------+----------------------+');
		console.log('|       Team 1      |   Score   |        Team 2        |');
		console.log('+-------------------+-----------+----------------------+');
		matches.forEach(match => {
			console.log(`| ${centerText(match.Team1, 17)} | ${centerText(match.Score, 9)} | ${centerText(match.Team2, 20)} |`);
		});
		console.log('+-------------------+-----------+----------------------+');
	}

	// Display the final standings of each group
	console.log('\n\n\n========================================================================================');
	console.log('                                   Final standings in groups');
	console.log('========================================================================================');
	for (const [group, teams] of Object.entries(standings)) {
		console.log(`\nGroup ${group}:`);
		console.log('+----------------------+--------+--------+--------+----------+------------+------------+');
		console.log('|        Team          |  Wins  | Losses | Points |  Scored  |  Conceded  | Point Diff |');
		console.log('+----------------------+--------+--------+--------+----------+------------+------------+');
		teams.forEach(team => {
			console.log(`| ${centerText(team.Team, 20)} | ${centerText(String(team.Wins), 6)} | ${centerText(String(team.Losses), 6)} | ${centerText(String(team.Points), 6)} | ${centerText(String(team.Scored), 8)} | ${centerText(String(team.Conceded), 10)} | ${centerText(String(team.PointDiff), 10)} |`);
		});
		console.log('+----------------------+--------+--------+--------+----------+------------+------------+');
	}
}

function rankTeamsAfterGroupPhase(standings) {
	const rankedTeams = [];

	// Collect all teams from the standings
	for (const group in standings) {
		rankedTeams.push(...standings[group]);
	}

	// Sort the teams by points, point difference, and total points scored
	rankedTeams.sort((a, b) => {
		if (a.Points !== b.Points) return b.Points - a.Points;
		if (a.PointDiff !== b.PointDiff) return b.PointDiff - a.PointDiff;
		return b.Scored - a.Scored;
	});

	// Assign teams to hats based on their ranking for the elimination phase
	const ranks = {
		1: rankedTeams.slice(0, 2),
		3: rankedTeams.slice(2, 4),
		5: rankedTeams.slice(4, 6),
		7: rankedTeams.slice(6, 8)
	};

	return ranks;
}

function drawQuarterAndSemiFinals(rankedTeams, groupMatches) {
	if (!groupMatches) {
		console.error('Error: groupMatches is undefined or null.');
		return {
			quarterFinals: [],
			semiFinalPairs: []
		};
	}

	const quarterFinals = [];
	const usedTeams = new Set();

	// Assign teams from ranked hats
	const hatD = rankedTeams[1];
	const hatE = rankedTeams[3];
	const hatF = rankedTeams[5];
	const hatG = rankedTeams[7];

	// Validate that each hat has exactly two teams
	if (!hatD || !hatE || !hatF || !hatG || hatD.length !== 2 || hatE.length !== 2 || hatF.length !== 2 || hatG.length !== 2) {
		console.error('Error: Each hat must have exactly two teams.');
		console.log('Hat D:', hatD);
		console.log('Hat E:', hatE);
		console.log('Hat F:', hatF);
		console.log('Hat G:', hatG);
		return {
			quarterFinals: [],
			semiFinalPairs: []
		};
	}

	// Function to check if two teams have played against each other
	function playedAgainstEachOther(team1, team2) {
		return groupMatches.some(match =>
			(match.team1 === team1 && match.team2 === team2) ||
			(match.team1 === team2 && match.team2 === team1)
		);
	}

	// Function to find valid pairs of teams for the quarterfinals
	function getValidPair(teamsA, teamsB) {
		const pairs = [];
		const availableTeamsB = [...teamsB];

		for (const teamA of teamsA) {
			const validPairIndex = availableTeamsB.findIndex(teamB => !playedAgainstEachOther(teamA, teamB));

			if (validPairIndex === -1) {
				console.error(`No valid pair found for ${teamA}`);
				return [];
			}

			const teamB = availableTeamsB.splice(validPairIndex, 1)[0];
			pairs.push({
				team1: teamA,
				team2: teamB
			});
			usedTeams.add(teamA);
			usedTeams.add(teamB);
		}

		return pairs;
	}

	// Get valid pairs for quarterfinal matches
	const quarterfinalsDandG = getValidPair(hatD, hatG);
	const quarterfinalsEandF = getValidPair(hatE, hatF);

	quarterFinals.push(...quarterfinalsDandG, ...quarterfinalsEandF);

	// Check for any unpaired teams and log them
	const unpairedTeams = [...new Set([...hatD, ...hatE, ...hatF, ...hatG].filter(team => !usedTeams.has(team)))];
	if (unpairedTeams.length > 0) {
		console.log('Unpaired teams:', unpairedTeams);
	}

	return {
		quarterFinals,
		semiFinalPairs: []
	};
}

function simulateEliminationPhase(quarterFinals, formScores) {
	console.log('\n\n\n===========================================================');
	console.log('                        Quarterfinal');
	console.log('===========================================================');
	const semiFinals = [];

	console.log('+----------------------+-----------+----------------------+');
	console.log('|        Team 1        |   Score   |        Team 2        |');
	console.log('+----------------------+-----------+----------------------+');

	// Simulate each quarterfinal match and determine which teams advance to the semifinals
	quarterFinals.forEach(match => {
		const result = processMatch(match, formScores);
		if (result.winner) {
			semiFinals.push(result.winner);
		}
	});
	console.log('+----------------------+-----------+----------------------+');


	console.log('\n\n\n===========================================================');
	console.log('                         Semifinal');
	console.log('===========================================================');
	console.log('+----------------------+-----------+----------------------+');
	console.log('|        Team 1        |   Score   |        Team 2        |');
	console.log('+----------------------+-----------+----------------------+');

	const semiFinalPairs = createPairs(semiFinals);
	const finalTeams = [];
	const semiFinalLosers = [];
	// Simulate each semifinal match and determine which teams advance to the finals and third-place match
	semiFinalPairs.forEach(pair => {
		const result = processMatch(pair, formScores);
		if (result.winner) {
			finalTeams.push(result.winner);
			semiFinalLosers.push(result.loser);
		}
	});
	console.log('+----------------------+-----------+----------------------+');


	console.log('\n\n\n===========================================================');
	console.log('                     Third Place Match');
	console.log('===========================================================');
	console.log('+----------------------+-----------+----------------------+');
	console.log('|        Team 1        |   Score   |        Team 2        |');
	console.log('+----------------------+-----------+----------------------+');

	// Simulate the third-place match
	if (semiFinalLosers.length === 2) {
		const result = processMatch({
			team1: semiFinalLosers[0],
			team2: semiFinalLosers[1]
		}, formScores);
	} 
	console.log('+----------------------+-----------+----------------------+');

	console.log('\n\n\n===========================================================');
	console.log('                           Final');
	console.log('===========================================================');
	console.log('+----------------------+-----------+----------------------+');
	console.log('|        Team 1        |   Score   |        Team 2        |');
	console.log('+----------------------+-----------+----------------------+');

	// Simulate the final match
	if (finalTeams.length === 2) {
		const result = processMatch({
			team1: finalTeams[0],
			team2: finalTeams[1]
		}, formScores);
		const thirdPlaceTeam = semiFinalLosers.find(loser => loser.Team !== result.winner.Team);

		if (result.winner) {
			console.log('+----------------------+-----------+----------------------+');
			console.log('\n\n\n======================');
			console.log('        Medals');
			console.log('======================');
			console.log('+--------------------+');
			console.log(`| 🥇 ${centerText(`1. ${result.winner.Team}`, 15)} |`);
			console.log('+--------------------+');
			console.log(`| 🥈 ${centerText(`2. ${result.loser.Team}`, 15)} |`);
			console.log('+--------------------+');
			console.log(`| 🥉 ${centerText(`3. ${thirdPlaceTeam.Team}`, 15)} |`);
			console.log('+--------------------+');
		}
	} else {
		console.error('Error: There should be exactly two teams for the final match.');
	}
}

function processMatch(match, formScores) {
	const team1Name = match.team1.Team;
	const team2Name = match.team2.Team;

	// Simulate the match and log the result
	const result = simulateMatch(match.team1, match.team2, formScores);
	console.log(`| ${centerText(team1Name, 20)} | ${centerText(`${result[team1Name]}:${result[team2Name]}`, 9)} | ${centerText(team2Name, 20)} |`);

	// Determine the winner and loser of the match
	if (result[team1Name] > result[team2Name]) {
		return {
			winner: match.team1,
			loser: match.team2
		};
	} else {
		return {
			winner: match.team2,
			loser: match.team1
		};
	}
}

function createPairs(teams) {
	const pairs = [];
	// Create pairs of teams for the next round
	for (let i = 0; i < teams.length; i += 2) {
		if (i + 1 < teams.length) {
			pairs.push({
				team1: teams[i],
				team2: teams[i + 1]
			});
		}
	}
	return pairs;
}

function simulateTournament() {
	const formScores = calculateTeamForm(exhibitions, groups);

	if (!formScores) {
		console.error('Error: formScores is undefined.');
		return;
	}

	const {
		results,
		standings,
		groupMatches
	} = simulateGroupPhase(groups, formScores);
	displayGroupPhaseResults(results, standings);

	const rankedTeams = rankTeamsAfterGroupPhase(standings);

	const {
		quarterFinals,
		semiFinalPairs
	} = drawQuarterAndSemiFinals(rankedTeams, groupMatches);

	// Simulate the elimination phase if valid quarterfinal matches were generated
	if (quarterFinals.length > 0) {
		simulateEliminationPhase(quarterFinals, formScores);
	} else {
		console.error('Error: No valid quarterfinal matches were generated.');
	}
}

function centerText(text = '', width = 20) {
	if (typeof text !== 'string') {
		text = '';
	}
	const padding = Math.max(0, width - text.length);
	const paddingLeft = Math.floor(padding / 2);
	const paddingRight = padding - paddingLeft;
	return ' '.repeat(paddingLeft) + text + ' '.repeat(paddingRight);
}

simulateTournament();
function simulateMultipleTournaments(numSimulations, logFilePath, groupMatches) {
    const medalCount = {};

    for (let i = 0; i < numSimulations; i++) {
        const formScores = calculateTeamForm(exhibitions, groups);

        const { standings } = simulateGroupPhase(groups, formScores);
        const rankedTeams = rankTeamsAfterGroupPhase(standings);
        const quarterFinals = drawQuarterAndSemiFinals(rankedTeams, groupMatches);

        if (quarterFinals.quarterFinals.length > 0) {
            const semiFinals = [];
            const finals = [];

            quarterFinals.quarterFinals.forEach(match => {
                const result = simulateMatch(match.team1, match.team2, formScores);
                const winner = result[match.team1.Team] > result[match.team2.Team] ? match.team1 : match.team2;
                semiFinals.push(winner);
            });

            if (semiFinals.length >= 4) {
                for (let i = 0; i < semiFinals.length; i += 2) {
                    const result = simulateMatch(semiFinals[i], semiFinals[i + 1], formScores);
                    const winner = result[semiFinals[i].Team] > result[semiFinals[i + 1].Team] ? semiFinals[i] : semiFinals[i + 1];
                    finals.push(winner);
                }

                if (finals.length >= 2) {
                    const finalResult = simulateMatch(finals[0], finals[1], formScores);
                    const firstPlace = finalResult[finals[0].Team] > finalResult[finals[1].Team] ? finals[0].Team : finals[1].Team;
                    const secondPlace = firstPlace === finals[0].Team ? finals[1].Team : finals[0].Team;

                    const thirdPlaceMatch = simulateMatch(semiFinals[2], semiFinals[3], formScores);
                    const thirdPlace = thirdPlaceMatch[semiFinals[2].Team] > thirdPlaceMatch[semiFinals[3].Team] ? semiFinals[2].Team : semiFinals[3].Team;

                    if (!medalCount[firstPlace]) medalCount[firstPlace] = { gold: 0, silver: 0, bronze: 0 };
                    if (!medalCount[secondPlace]) medalCount[secondPlace] = { gold: 0, silver: 0, bronze: 0 };
                    if (!medalCount[thirdPlace]) medalCount[thirdPlace] = { gold: 0, silver: 0, bronze: 0 };

                    medalCount[firstPlace].gold++;
                    medalCount[secondPlace].silver++;
                    medalCount[thirdPlace].bronze++;
                }
            }
        }
    }

    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    logStream.write(`\nResults after ${numSimulations} simulations:\n`);
    logStream.write('========================================\n');

    for (const [country, medals] of Object.entries(medalCount)) {
        logStream.write(`${country} - Gold: ${medals.gold}, Silver: ${medals.silver}, Bronze: ${medals.bronze}\n`);
    }

    logStream.end();
}


const { groupMatches } = simulateGroupPhase(groups, formScores);
simulateMultipleTournaments(100, 'simulation_results.txt', groupMatches);
