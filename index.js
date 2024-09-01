const fs = require('fs');

// Učitavanje grupa i rangiranja iz JSON fajlova
// `groups.json` sadrži podatke o grupama i timovima
// `exhibitions.json` sadrži podatke o prijateljskim utakmicama
let groups, exhibitions;

try {
    // Učitavanje JSON fajlova i parsiranje u JavaScript objekte
    groups = JSON.parse(fs.readFileSync('groups.json', 'utf-8'));
    exhibitions = JSON.parse(fs.readFileSync('exhibitions.json', 'utf-8'));
} catch (err) {
    // Ispisivanje greške u slučaju neuspešnog učitavanja fajlova
    console.error('Greška pri učitavanju JSON fajlova:', err.message);
    process.exit(1); // Prekid programa zbog kritične greške
}

// Funkcija za izračunavanje forme tima na osnovu prijateljskih utakmica
function calculateTeamForm(exhibitions, groups) {
    // Provera da li su podaci o grupama ili prijateljskim utakmicama undefined ili null
    if (!groups || !exhibitions) {
        console.error('Greška: podaci o grupama ili prijateljskim utakmicama su undefined ili null.');
        return {}; // Vraća prazan objekat u slučaju greške
    }

    const formScores = {}; // Objekat za čuvanje forme svakog tima

    // Pravljenje liste svih timova iz grupa
    const allTeams = [];
    for (const group of Object.values(groups)) {
        if (Array.isArray(group)) {
            allTeams.push(...group); // Dodavanje timova u listu
        } else {
            console.error('Neispravan format grupe:', group); // Ispis greške ako je format grupe neispravan
        }
    }

    // Izračunavanje forme za svaki tim na osnovu prijateljskih utakmica
    for (const [team, matches] of Object.entries(exhibitions)) {
        let formScore = 0; // Inicijalna vrednost forme za tim
        matches.forEach(match => {
            // Računanje razlike u rezultatu između tima i protivnika
            const [teamScore, opponentScore] = match.Result.split('-').map(Number);
            const scoreDiff = teamScore - opponentScore;

            // Pronalaženje protivnika i dobijanje njegovog rangiranja
            const opponent = allTeams.find(t => t.ISOCode === match.Opponent);
            const opponentRank = opponent ? opponent.FIBARanking : 10; // Ako protivnik nije nađen, postavlja se default vrednost

            // Dodavanje vrednosti formScore bazirano na rezultatu i rangiranju protivnika
            formScore += scoreDiff + opponentRank / 100;
        });
        formScores[team] = formScore / matches.length; // Prosečan formScore tima
    }
    return formScores; // Vraćanje forme svih timova
}

// Pokretanje funkcije za izračunavanje forme tima
const formScores = calculateTeamForm(exhibitions, groups);


// Pokretanje simulacije
calculateTeamForm(exhibitions, groups);

// Funkcija koja simulira rezultat utakmice između dva tima
function simulateMatch(team1, team2, formScores) {
    // Provera da li je formScores undefined
    if (!formScores) {
        console.error('Greška: formScores je undefined.');
        return {
            [team1.Team]: 0,
            [team2.Team]: 0,
        };
    }

    // Provera da li su timovi validni
    if (!team1 || !team2) {
        console.error(`Greška: nevalidni timovi za simulaciju utakmice: ${team1 ? team1.Team : 'Nepoznato'} vs ${team2 ? team2.Team : 'Nepoznato'}`);
        return {
            [team1 ? team1.Team : 'Nepoznato']: 0,
            [team2 ? team2.Team : 'Nepoznato']: 0,
        };
    }

    // Provera da li formScores sadrži podatke za oba tima
    if (!(team1.Team in formScores)) {
        formScores[team1.Team] = 0; // Ako nema formScore za tim1, postavlja se na 0
    }

    if (!(team2.Team in formScores)) {
        formScores[team2.Team] = 0; // Ako nema formScore za tim2, postavlja se na 0
    }

    const rank1 = team1.FIBARanking || 0; // Rangiranje tima 1
    const rank2 = team2.FIBARanking || 0; // Rangiranje tima 2
    const rankDiff = rank1 - rank2; // Razlika u rangiranju

    const form1 = formScores[team1.Team] || 0; // Forma tima 1
    const form2 = formScores[team2.Team] || 0; // Forma tima 2
    const formDiff = form1 - form2; // Razlika u formi

    // Generisanje nasumičnih rezultata uzimajući u obzir rangiranje i formu
    const score1 = Math.floor(Math.random() * 50 + 75 + rankDiff + formDiff);
    const score2 = Math.floor(Math.random() * 50 + 75 - rankDiff - formDiff);

    // Provera da li su rezultati validni brojevi
    if (isNaN(score1) || isNaN(score2)) {
        console.error(`Greška u simulaciji utakmice između ${team1.Team} i ${team2.Team}: Nevalidni rezultati`);
        return {
            [team1.Team]: 0,
            [team2.Team]: 0,
        };
    }

    return {
        [team1.Team]: score1, // Vraćanje rezultata za tim 1
        [team2.Team]: score2, // Vraćanje rezultata za tim 2
    };
}

// Funkcija koja simulira grupnu fazu turnira
function simulateGroupPhase(groups, formScores) {
    const results = {}; // Objekat za čuvanje rezultata mečeva
    const standings = {}; // Objekat za čuvanje stanja timova u grupama

    for (const [group, teams] of Object.entries(groups)) {
        results[group] = []; // Inicijalizacija rezultata za grupu
        standings[group] = teams.map(team => ({
            Team: team.Team,
            Wins: 0,
            Losses: 0,
            Points: 0,
            Scored: 0,
            Conceded: 0,
            PointDiff: 0
        }));

        // Simulacija utakmica između timova u svakoj grupi
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const matchResult = simulateMatch(teams[i], teams[j], formScores); // Simulacija meča
                const team1 = standings[group].find(t => t.Team === teams[i].Team);
                const team2 = standings[group].find(t => t.Team === teams[j].Team);

                const team1Score = matchResult[teams[i].Team];
                const team2Score = matchResult[teams[j].Team];

                // Ažuriranje statistike za tim1
                team1.Scored += team1Score;
                team1.Conceded += team2Score;
                team1.PointDiff += (team1Score - team2Score);

                // Ažuriranje statistike za tim2
                team2.Scored += team2Score;
                team2.Conceded += team1Score;
                team2.PointDiff += (team2Score - team1Score);

                // Ažuriranje pobeda, poraza i poena na osnovu rezultata meča
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

                // Čuvanje rezultata meča
                results[group].push({
                    Team1: teams[i].Team,
                    Team2: teams[j].Team,
                    Score: `${team1Score}:${team2Score}`
                });
            }
        }

        // Sortiranje timova u grupi prema broju poena, koš razlici i postignutim poenima
        standings[group].sort((a, b) => {
            if (a.Points !== b.Points) return b.Points - a.Points;
            if (a.PointDiff !== b.PointDiff) return b.PointDiff - a.PointDiff;
            return b.Scored - a.Scored;
        });
    }

    return {
        results,
        standings
    };
}

// Funkcija koja prikazuje rezultate grupne faze
function displayGroupPhaseResults(results, standings) {
    console.log('\n\n======================================================');
    console.log('                  Group phase results');
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

    console.log('\n\n\n========================================================================================');
    console.log('                              Final standings in groups');
    console.log('========================================================================================\n');
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

// Funkcija koja rangira timove nakon grupne faze
function rankTeamsAfterGroupPhase(standings) {
    const rankedTeams = [];

    // Dodavanje svih timova iz svih grupa u jedan niz
    for (const group in standings) {
        rankedTeams.push(...standings[group]);
    }

    // Sortiranje timova po bodovima, koš razlici i postignutim poenima
    rankedTeams.sort((a, b) => {
        if (a.Points !== b.Points) return b.Points - a.Points;
        if (a.PointDiff !== b.PointDiff) return b.PointDiff - a.PointDiff;
        return b.Scored - a.Scored;
    });

    // Raspoređivanje timova u šešire prema rangiranju
    const ranks = {
        1: rankedTeams.slice(0, 3),  // Šešir D
        4: rankedTeams.slice(3, 6),  // Šešir E
        7: rankedTeams.slice(6, 9)   // Šešir F
    };

    // Vraćanje timova raspoređenih po šeširima
    return ranks;
}

// Funkcija za formiranje parova četvrtfinala na osnovu rangiranja
function drawQuarterFinals(rankedTeams) {
    const quarterFinals = [];

    const hatD = rankedTeams[1];  // Timovi iz šešira D
    const hatE = rankedTeams[4];  // Timovi iz šešira E
    const hatF = rankedTeams[7];  // Timovi iz šešira F

    // Provera da li su svi šeširi validni, ako nisu, ispisuje se greška
    if (!hatD || !hatE || !hatF) {
        console.error('Error: Invalid ranking data. One of the hats is undefined.');
        return [];
    }

    // Formiranje parova četvrtfinala tako da timovi iz šešira D igraju protiv timova iz šešira F
    quarterFinals.push([hatD[0], hatF[2]]);
    quarterFinals.push([hatD[1], hatF[1]]);
    quarterFinals.push([hatE[0], hatF[0]]);
    quarterFinals.push([hatE[1], hatD[2]]);

    // Vraćanje formiranih parova četvrtfinala
    return quarterFinals;
}

// Funkcija za simulaciju i prikaz eliminacione faze
function simulateEliminationPhase(quarterFinals, formScores) {
    console.log('\n\n===========================================================');
    console.log('                        Quarterfinal');
    console.log('===========================================================');
    const semiFinals = [];  // Timovi koji prolaze u polufinale
    console.log('+----------------------+-----------+----------------------+');
    console.log('|        Team 1        |   Score   |        Team 2        |');
    console.log('+----------------------+-----------+----------------------+');
    quarterFinals.forEach(([team1, team2]) => {
        const result = simulateMatch(team1, team2, formScores);  // Simulacija meča
        console.log(`| ${centerText(team1.Team, 20)} | ${centerText(String(result[team1.Team]), 9)} | ${centerText(team2.Team, 20)} |`);
        if (result[team1.Team] > result[team2.Team]) {
            semiFinals.push(team1);  // Tim 1 prolazi u polufinale
        } else {
            semiFinals.push(team2);  // Tim 2 prolazi u polufinale
        }
    });
    console.log('+----------------------+-----------+----------------------+');

    console.log('\n\n===========================================================');
    console.log('                         Semifinal');
    console.log('===========================================================');
    const finals = [];  // Timovi koji prolaze u finale
    const thirdPlaceMatch = [];  // Timovi koji će igrati za treće mesto
    console.log('+----------------------+-----------+----------------------+');
    console.log('|        Team 1        |   Score   |        Team 2        |');
    console.log('+----------------------+-----------+----------------------+');
    for (let i = 0; i < semiFinals.length; i += 2) {
        const result = simulateMatch(semiFinals[i], semiFinals[i + 1], formScores);  // Simulacija meča
        console.log(`| ${centerText(semiFinals[i].Team, 20)} | ${centerText(String(result[semiFinals[i].Team]), 9)} | ${centerText(semiFinals[i + 1].Team, 20)} |`);
        if (result[semiFinals[i].Team] > result[semiFinals[i + 1].Team]) {
            finals.push(semiFinals[i]);  // Tim 1 prolazi u finale
            thirdPlaceMatch.push(semiFinals[i + 1]);  // Tim 2 igra za treće mesto
        } else {
            finals.push(semiFinals[i + 1]);  // Tim 2 prolazi u finale
            thirdPlaceMatch.push(semiFinals[i]);  // Tim 1 igra za treće mesto
        }
    }
    console.log('+----------------------+-----------+----------------------+');

    console.log('\n\n===========================================================');
    console.log('                     Third place match');
    console.log('===========================================================');
    console.log('+----------------------+-----------+----------------------+');
    console.log('|        Team 1        |   Score   |        Team 2        |');
    console.log('+----------------------+-----------+----------------------+');
    const thirdPlaceResult = simulateMatch(thirdPlaceMatch[0], thirdPlaceMatch[1], formScores);  // Simulacija meča za treće mesto
    console.log(`| ${centerText(thirdPlaceMatch[0].Team, 20)} | ${centerText(String(thirdPlaceResult[thirdPlaceMatch[0].Team]), 9)} | ${centerText(thirdPlaceMatch[1].Team, 20)} |`);
    console.log('+----------------------+-----------+----------------------+');
    const thirdPlace = thirdPlaceResult[thirdPlaceMatch[0].Team] > thirdPlaceResult[thirdPlaceMatch[1].Team] ? thirdPlaceMatch[0] : thirdPlaceMatch[1];

    console.log('\n\n===========================================================');
    console.log('                           Final');
    console.log('===========================================================');
    console.log('+----------------------+-----------+----------------------+');
    console.log('|        Team 1        |   Score   |        Team 2        |');
    console.log('+----------------------+-----------+----------------------+');
    const finalResult = simulateMatch(finals[0], finals[1], formScores);  // Simulacija finalnog meča
    console.log(`| ${centerText(finals[0].Team, 20)} | ${centerText(String(finalResult[finals[0].Team]), 9)} | ${centerText(finals[1].Team, 20)} |`);
    console.log('+----------------------+-----------+----------------------+');
    const firstPlace = finalResult[finals[0].Team] > finalResult[finals[1].Team] ? finals[0] : finals[1];  // Pobednik finala
    const secondPlace = firstPlace === finals[0] ? finals[1] : finals[0];  // Drugoplasirani tim

    console.log('\n\n======================');
    console.log('        Medals');
    console.log('======================');    
    console.log('+--------------------+');
    console.log(`| 🥇 ${centerText(`1. ${firstPlace.Team}`, 15)} |`);  // Prvo mesto - zlatna medalja
    console.log('+--------------------+');
    console.log(`| 🥈 ${centerText(`2. ${secondPlace.Team}`, 15)} |`);  // Drugo mesto - srebrna medalja
    console.log('+--------------------+');
    console.log(`| 🥉 ${centerText(`3. ${thirdPlace.Team}`, 15)} |`);  // Treće mesto - bronzana medalja
    console.log('+--------------------+');
}

// Funkcija za simulaciju celog turnira
function simulateTournament() {
    const formScores = calculateTeamForm(exhibitions, groups);  // Izračunavanje forme timova

    if (!formScores) {
        console.error('Error: formScores is undefined.');
        return;
    }

    const {
        results,
        standings
    } = simulateGroupPhase(groups, formScores);  // Simulacija grupne faze
    displayGroupPhaseResults(results, standings);  // Prikaz rezultata grupne faze

    const rankedTeams = rankTeamsAfterGroupPhase(standings);  // Rangiranje timova nakon grupne faze
    const quarterFinals = drawQuarterFinals(rankedTeams);  // Formiranje parova četvrtfinala

    if (quarterFinals.length > 0) {
        simulateEliminationPhase(quarterFinals, formScores);  // Simulacija eliminacione faze
    } else {
        console.error('Error: No valid quarterfinal matches were generated.');
    }
}

// Funkcija za centriranje teksta u okviru određenog širinskog prostora
function centerText(text, width) {
    const padding = width - text.length;  // Proračunavanje razmaka
    const paddingLeft = Math.floor(padding / 2);  // Razmaci s leve strane
    const paddingRight = padding - paddingLeft;  // Razmaci s desne strane
    return ' '.repeat(paddingLeft) + text + ' '.repeat(paddingRight);  // Vraća centriran tekst
}

// Pokretanje simulacije turnira
simulateTournament();

// Funkcija koja simulira više turnira i beleži rezultate u fajl
function simulateMultipleTournaments(numSimulations, logFilePath) {
    const medalCount = {};  // Objekat za čuvanje broja medalja za svaki tim

    for (let i = 0; i < numSimulations; i++) {
        const formScores = calculateTeamForm(exhibitions, groups);  // Izračunavanje forme timova

        const {
            results,
            standings
        } = simulateGroupPhase(groups, formScores);  // Simulacija grupne faze
        const rankedTeams = rankTeamsAfterGroupPhase(standings);  // Rangiranje timova nakon grupne faze
        const quarterFinals = drawQuarterFinals(rankedTeams);  // Formiranje parova četvrtfinala

        if (quarterFinals.length > 0) {
            const semiFinals = [];  // Timovi koji prolaze u polufinale
            const finals = [];  // Timovi koji prolaze u finale

            quarterFinals.forEach(([team1, team2]) => {
                const result = simulateMatch(team1, team2, formScores);  // Simulacija meča
                const winner = result[team1.Team] > result[team2.Team] ? team1 : team2;
                semiFinals.push(winner);  // Pobednik prolazi u polufinale
            });

            if (semiFinals.length >= 4) {
                for (let i = 0; i < semiFinals.length; i += 2) {
                    const result = simulateMatch(semiFinals[i], semiFinals[i + 1], formScores);  // Simulacija meča
                    const winner = result[semiFinals[i].Team] > result[semiFinals[i + 1].Team] ? semiFinals[i] : semiFinals[i + 1];
                    finals.push(winner);  // Pobednik prolazi u finale
                }

                if (finals.length >= 2) {
                    const finalResult = simulateMatch(finals[0], finals[1], formScores);  // Simulacija finalnog meča
                    const firstPlace = finalResult[finals[0].Team] > finalResult[finals[1].Team] ? finals[0].Team : finals[1].Team;
                    const secondPlace = firstPlace === finals[0].Team ? finals[1].Team : finals[0].Team;

                    const thirdPlaceMatch = simulateMatch(semiFinals[2], semiFinals[3], formScores);  // Simulacija meča za treće mesto
                    const thirdPlace = thirdPlaceMatch[semiFinals[2].Team] > thirdPlaceMatch[semiFinals[3].Team] ? semiFinals[2].Team : semiFinals[3].Team;

                    if (!medalCount[firstPlace]) medalCount[firstPlace] = {
                        gold: 0,
                        silver: 0,
                        bronze: 0
                    };
                    if (!medalCount[secondPlace]) medalCount[secondPlace] = {
                        gold: 0,
                        silver: 0,
                        bronze: 0
                    };
                    if (!medalCount[thirdPlace]) medalCount[thirdPlace] = {
                        gold: 0,
                        silver: 0,
                        bronze: 0
                    };

                    medalCount[firstPlace].gold++;  // Dodavanje zlata za prvoplasirani tim
                    medalCount[secondPlace].silver++;  // Dodavanje srebra za drugoplasirani tim
                    medalCount[thirdPlace].bronze++;  // Dodavanje bronze za trećeplasirani tim
                }
            }
        }
    }

    // Otvaranje fajla za upisivanje rezultata
    const logStream = fs.createWriteStream(logFilePath, {
        flags: 'a'
    });
    logStream.write(`Results after ${numSimulations} simulations:\n`);
    logStream.write('========================================\n');

    // Upisivanje broja osvojenih medalja za svaki tim u fajl
    for (const [country, medals] of Object.entries(medalCount)) {
        logStream.write(`${country} - Gold: ${medals.gold}, Silver: ${medals.silver}, Bronze: ${medals.bronze}\n`);
    }

    logStream.end();  // Zatvaranje fajla nakon upisivanja rezultata
}


// simulateMultipleTournaments(1000000000, 'tournament_results.txt');
