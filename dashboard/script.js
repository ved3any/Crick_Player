const WEB_URL = "";
const API_URL = "/api"
const logoutBtns = document.querySelectorAll(".logout-button");

window.addEventListener("DOMContentLoaded", () => {
    const val = getCookie("loggedin");
    if (val != "true") {
        window.location.pathname = WEB_URL + "/login";
        return;
    }

    const id = getCookie("id");
    if (!id) {
        alert("No user session found.");
        logout()
        return;
    }

    fetch(API_URL + "/data/" + id)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to fetch user data: " + res.status);
            }
            return res.json();
        })
        .then(data => {
            sessionStorage.setItem('data', JSON.stringify(data));
        })
        .catch(err => {
            alert(err.message);
            window.location.pathname = WEB_URL + "/login";
        });
    switchtabs();
    filltablerows();

    // setTimeout(() => {
    //     try {
    //         if (document.querySelectorAll('#score-table tbody tr').length != JSON.parse(sessionStorage.getItem('players')).length) {
    //             window.location.reload()
    //         }
    //     } catch {
    //         window.location.reload()
    //     }
    // }, 50);

});

function CreateOrUpdateCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; Secure`;
}

function getCookie(name) {
    const cookies = document.cookie.split("; ");
    for (let c of cookies) {
        const [key, val] = c.split("=");
        if (key === name) return val;
    }
    return null;
}

document.querySelectorAll('#nav li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('#nav li').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (document.getElementById('nav').classList.contains('sidebar')) {
            toggleSidebar()
        }
        switchtabs()
    });
});

logoutBtns.forEach(b => {
    b.addEventListener("click", logout)
});


function logout() {
    CreateOrUpdateCookie("loggedin", "false", 1);
    CreateOrUpdateCookie("id", "", 1);
    sessionStorage.removeItem("players");
    sessionStorage.removeItem("data");
    window.location.pathname = WEB_URL + "/login";
}

function toggleSidebar() {
    const nav = document.getElementById('nav');
    nav.classList.toggle('sidebar');
    nav.classList.toggle('active');
    if (nav.classList.contains('sidebar')) {
        nav.querySelector('#logout-btn').style.display = "block"
    } else {
        nav.querySelector('#logout-btn').style.display = "none"
    }
    nav.querySelectorAll('li').forEach(child => {
        child.classList.toggle('li');
        child.classList.toggle('nav-tab');
    });

    document.getElementById('overlay').classList.toggle('active');
}

function switchtabs() {
    const navtab = document.getElementById('nav').querySelector('.active').id;
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => {
        t.style.display = "none";
    })
    switch (navtab) {
        case 'home-nav':
            document.getElementById('home-tab').style.display = "block";
            break;
        case 'players-nav':
            document.getElementById('players-tab').style.display = "flex";
            break;
        case 'match-nav':
            document.getElementById('match-tab').style.display = "flex";
            break;
    }
}

document.querySelectorAll('.team-options button').forEach(b => {
    b.addEventListener('click', e => {
        document.querySelectorAll('.team-options button').forEach(t => {
            t.classList.remove('active');
        })
        b.classList.add('active')
    })
})

function save_matchscores(players, plyrs) {
    // Deduplicate both arrays by id
    players = players.reduce((acc, curr) => {
        if (!acc.some(p => p.id === curr.id)) acc.push(curr);
        return acc;
    }, []);

    plyrs = plyrs.reduce((acc, curr) => {
        if (!acc.some(p => p.id === curr.id)) acc.push(curr);
        return acc;
    }, []);


    let updatedPlayers = plyrs.map(storedPlayer => {
        const livePlayer = players.find(p => p.id === storedPlayer.id);
        if (livePlayer) {
            return mergePlayerStats(storedPlayer, livePlayer);
        }
        return storedPlayer;
    });


    sessionStorage.setItem("players", JSON.stringify(updatedPlayers));

    fetch(API_URL + "/update-player-scores",
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'plyrs': JSON.stringify(updatedPlayers) })
        })
        .then(async res => {
            if (!res.ok) {
                body = await res.text()
                alert(body)
            }
        })
}

function getPlayerOfTheMatch(players) {
    console.log(players)
    return players.reduce((best, player) => {
        // Destructure relevant stats with defaults
        const {
            total_runs = 0,
            total_wickets = 0,
            total_fours = 0,
            total_sixes = 0,
            total_overs = 0,
            bat_average = 0,
            total_matches = 1  // fallback to 1 to avoid division by zero
        } = player;

        // Scoring formula
        const battingScore = (
            total_runs * 1 +
            total_fours * 0.5 +
            total_sixes * 1.5 +
            (total_runs >= 30 ? 5 : 0) +
            (total_runs >= 50 ? 10 : 0) +
            (total_runs >= 100 ? 15 : 0) +
            bat_average * 1
        );

        const bowlingScore = (
            total_wickets * 20 +
            total_overs * 2
        );

        const consistencyBonus = total_matches >= 5 ? 5 : 0;

        const totalScore = battingScore + bowlingScore + consistencyBonus;

        if (!best || totalScore > best.score) {
            return {
                player,
                score: totalScore
            };
        }

        return best;
    }, null)?.player || null;
}


async function playmatch() {
    document.getElementById('st-div').style.display = "none";
    document.getElementById('team-select').style.display = "flex";
    const players = JSON.parse(sessionStorage.getItem("players"))
    let first_inning = true;

    document.getElementById('team-a').innerHTML = ""
    document.getElementById('team-b').innerHTML = ""
    document.getElementById('sourceList').innerHTML = ""

    players.forEach(player => {
        const newLi = document.createElement('li');
        newLi.setAttribute('data-id', player.id);
        newLi.classList.add('list_item')
        newLi.innerHTML = `${player.name} <span>
            <button class="list-button" onclick="moveItem(this, 'team-a')">To Team A</button>
            <button class="list-button" onclick="moveItem(this, 'team-b')">To Team B</button>
            </span>`;

        document.getElementById('sourceList').appendChild(newLi);
    })

    const Team_A = []
    const Team_B = []

    await new Promise(resolve => {
        document.getElementById('btn-done').addEventListener('click', () => {
            document.querySelectorAll('#team-select #team-a li').forEach(p => {
                players.forEach(player => {
                    if (player.id == p.getAttribute('data-id')) {
                        Team_A.push({ ...player })
                    }
                })
            })

            document.querySelectorAll('#team-select #team-b li').forEach(p => {
                players.forEach(player => {
                    if (player.id == p.getAttribute('data-id')) {
                        Team_B.push({ ...player })
                    }
                })
            })

            if (Team_A.length == 0 || Team_B.length == 0) {
                alert('Please Select Atleast One Team Player For Each Team')
                playmatch()
            }
            else {
                resolve();
            }
        }, { once: true });
    })
    batting_team = 0; // 0 - Team A 
    // 1 - Team B

    if (document.querySelector('.team-options .active').getAttribute('data-team') == 'team-a') {
        batting_team = 0;
    } else {
        batting_team = 1;
    }

    document.getElementById('team-select').style.display = "none"
    document.getElementById('striker-select').style.display = "flex"
    document.getElementById('striker').innerHTML = ""

    let plyrs = [...Team_A, ...Team_B];

    Team_A.forEach(p => {
        p.bat_average = 0
        p.total_fours = 0
        p.total_overs = 0
        p.total_runs = 0
        p.total_sixes = 0
        p.total_wickets = 0
    })
    Team_B.forEach(p => {
        p.bat_average = 0
        p.total_fours = 0
        p.total_overs = 0
        p.total_runs = 0
        p.total_sixes = 0
        p.total_wickets = 0
    })


    if (batting_team == 0) {

        Team_A.forEach(player => {
            e = document.createElement('option')
            e.innerHTML = `${player.name}`;
            e.value = `${Team_A.indexOf(player)}`;
            document.getElementById('striker').appendChild(e);
        })

        document.getElementById('non-striker').innerHTML = document.getElementById('striker').innerHTML

        Team_B.forEach(player => {
            e = document.createElement('option')
            e.innerHTML = `${player.name}`;
            e.value = `${Team_B.indexOf(player)}`;
            document.getElementById('bowler').appendChild(e);
        })

        document.getElementById('bowlers').innerHTML = document.getElementById('bowler').innerHTML;

    }
    else {

        Team_B.forEach(player => {
            e = document.createElement('option')
            e.innerHTML = `${player.name}`;
            e.value = `${Team_B.indexOf(player)}`;
            document.getElementById('striker').appendChild(e);
        })

        document.getElementById('non-striker').innerHTML = document.getElementById('striker').innerHTML

        Team_A.forEach(player => {
            e = document.createElement('option')
            e.innerHTML = `${player.name}`;
            e.value = `${Team_A.indexOf(player)}`;
            document.getElementById('bowler').appendChild(e);

        })
        document.getElementById('bowlers').innerHTML = document.getElementById('bowler').innerHTML;
    }

    document.getElementById('batsmen').innerHTML = document.getElementById('striker').innerHTML;

    document.getElementById('striker').dispatchEvent(new CustomEvent('change'));
    await new Promise(resolve => {
        document.getElementById('btn-striker-selected').addEventListener('click', e => {
            resolve();
        })
    }, { once: true })

    document.getElementById('striker-select').style.display = "none"
    striker = ""
    non_striker = ""
    bowler = ""
    if (batting_team == 0) {
        striker = Team_A[document.getElementById('striker').value]
        non_striker = Team_A[document.getElementById('non-striker').value]
        bowler = Team_B[document.getElementById('bowler').value]

    }
    else {
        striker = Team_B[document.getElementById('striker').value]
        non_striker = Team_B[document.getElementById('non-striker').value]
        bowler = Team_A[document.getElementById('bowler').value]
    }
    document.getElementById('control-panel').style.display = 'flex'
    document.getElementById('match-tab').style.padding = "1px 0px"

    balls = 0;

    striker.total_runs = 0;
    team_runs = 0;
    wickets = 0;

    if (non_striker == null) {
        non_striker = {
            name: "No Non Striker!",
            total_runs: "",
            id: ""
        }
    } else {
        non_striker.total_runs = 0;
    }

    function intersectListsById(firstList, secondList) {
        const secondIds = new Set(secondList.map(item => item.id));
        return firstList.filter(item => secondIds.has(item.id));
    }

    async function inning_over() {
        if (first_inning) {
            first_inning = false

            if (batting_team) {
                document.getElementById('teamB-runs').innerHTML = team_runs
                document.getElementById('teamA-wickets').innerHTML = wickets
            } else {
                document.getElementById('teamA-runs').innerHTML = team_runs
                document.getElementById('teamB-wickets').innerHTML = wickets
            }
            document.getElementById("target-score").textContent = parseInt(team_runs) + 1;
            document.getElementById('control-panel').style.display = "none"
            document.getElementById('striker-select').style.display = "flex"
            document.getElementById('striker-select').style.marginTop = "10px"
            document.getElementById('striker').innerHTML = ""
            document.getElementById('bowler').innerHTML = ""
            document.getElementById("innings-info").style.display = "flex"

            if (batting_team) {
                batting_team = false;
            } else {
                batting_team = true;
            }

            if (batting_team == 0) {

                Team_A.forEach(player => {
                    e = document.createElement('option')
                    e.innerHTML = `${player.name}`;
                    e.value = `${Team_A.indexOf(player)}`;
                    document.getElementById('striker').appendChild(e);
                })

                document.getElementById('non-striker').innerHTML = document.getElementById('striker').innerHTML

                Team_B.forEach(player => {
                    e = document.createElement('option')
                    e.innerHTML = `${player.name}`;
                    e.value = `${Team_B.indexOf(player)}`;
                    document.getElementById('bowler').appendChild(e);
                })

                document.getElementById('bowlers').innerHTML = document.getElementById('bowler').innerHTML;

            }
            else {

                Team_B.forEach(player => {
                    e = document.createElement('option')
                    e.innerHTML = `${player.name}`;
                    e.value = `${Team_B.indexOf(player)}`;
                    document.getElementById('striker').appendChild(e);
                })

                document.getElementById('non-striker').innerHTML = document.getElementById('striker').innerHTML

                Team_A.forEach(player => {
                    e = document.createElement('option')
                    e.innerHTML = `${player.name}`;
                    e.value = `${Team_A.indexOf(player)}`;
                    document.getElementById('bowler').appendChild(e);

                })
                document.getElementById('bowlers').innerHTML = document.getElementById('bowler').innerHTML;
            }

            document.getElementById('batsmen').innerHTML = document.getElementById('striker').innerHTML;

            document.getElementById('striker').dispatchEvent(new CustomEvent('change'));
            await new Promise(resolve => {
                document.getElementById('btn-striker-selected').addEventListener('click', e => {
                    resolve();
                })
            }, { once: true })

            document.getElementById('striker-select').style.display = "none"
            striker = ""
            non_striker = ""
            bowler = ""
            if (batting_team == 0) {
                striker = Team_A[document.getElementById('striker').value]
                non_striker = Team_A[document.getElementById('non-striker').value]
                bowler = Team_B[document.getElementById('bowler').value]

            }
            else {
                striker = Team_B[document.getElementById('striker').value]
                non_striker = Team_B[document.getElementById('non-striker').value]
                bowler = Team_A[document.getElementById('bowler').value]
            }
            document.getElementById("team-runs").classList.add('team-runs-opp')
            document.getElementById("team-runs").classList.remove('team-runs')
            document.querySelector('#team-runs span').innerText = "0-" + parseInt(parseInt(team_runs) + 1)
            document.getElementById("innings-info").style.display = "none"
            document.getElementById('control-panel').style.display = 'flex'
            document.getElementById('match-tab').style.padding = "1px 0px"

            balls = 0;

            striker.total_runs = 0;
            team_runs = 0;
            wickets = 0;

            if (non_striker == null) {
                non_striker = {
                    name: "No Non Striker!",
                    total_runs: "",
                    id: ""
                }
            } else {
                non_striker.total_runs = 0;
            }

        }
        else {
            save_matchscores(players, plyrs)
            let best_player = getPlayerOfTheMatch(intersectListsById(players, plyrs))
            let f_str = best_player.name + ' - ' + best_player.total_runs + ' Runs , ' + best_player.total_wickets + ' Wickets'
            document.getElementById("player-of-match").innerHTML = f_str
            if (batting_team) {
                document.getElementById('teamB-runs').innerHTML = team_runs
                document.getElementById('teamA-wickets').innerHTML = wickets
            } else {
                document.getElementById('teamA-runs').innerHTML = team_runs
                document.getElementById('teamB-wickets').innerHTML = wickets
            }
            let t = document.querySelector('#team-runs span').innerText.split('-')
            if (team_runs >= parseInt(t[1])) {
                if (batting_team) {
                    document.querySelector(".match-summary-card p").innerHTML = "Team B Wonn!"
                } else {
                    document.querySelector(".match-summary-card p").innerHTML = "Team A Wonn!"
                }
            }
            document.getElementById("match-over-screen").style.display = "flex"

        }
        updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
    }

    updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)

    await new Promise(resolve => {

        document.getElementById('fair').addEventListener('click', async e => {
            document.getElementById("overlay").classList.add("active")
            document.getElementById("overlay").removeAttribute("onclick")
            document.getElementById("menu").removeAttribute("onclick")
            document.getElementById("runs-select").style.display = "block";

            await new Promise(res => {
                document.getElementById("runs-select").addEventListener("submit", e => {
                    e.preventDefault();
                    res()
                })
            })
            run = document.getElementById("runs-ran").value
            striker.total_runs = parseInt(striker.total_runs) + parseInt(run)
            team_runs = parseInt(team_runs) + parseInt(run)
            if (run == 1 || run == 3) {
                if (!non_striker.id == "") {
                    temp = striker
                    striker = non_striker
                    non_striker = temp
                }
            } else if (run == 6) {
                striker.total_sixes++;
            }
            else if (run == 4) {
                striker.total_fours++;
            }

            document.getElementById("runs-select").style.display = "none";

            if (balls == 5) {
                document.getElementById("bowler-select").style.display = "block"

                await new Promise(res => {
                    document.getElementById("bowler-select").addEventListener("submit", e => {
                        e.preventDefault()
                        res()
                    })
                })

                bowler.total_overs++
                players[bowler.id] = bowler

                if (batting_team) {
                    bowler = Team_A[document.getElementById("bowlers").value]
                }
                else {
                    bowler = Team_B[document.getElementById("bowlers").value]
                }
                document.getElementById("bowler-select").style.display = "none"
                balls = -1
                if (!non_striker.id == "") {
                    temp = striker
                    striker = non_striker
                    non_striker = temp
                }
            }

            balls++;

            document.getElementById("overlay").classList.remove("active")
            document.getElementById("overlay").setAttribute("onclick", "toggleSidebar()")
            document.getElementById("menu").setAttribute("onclick", "toggleSidebar()")

            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)

            if (!first_inning) {
                let t = document.querySelector('#team-runs span').innerText.split('-')
                if (team_runs >= parseInt(t[1])) {
                    inning_over();
                    return; // stop further updates
                }
            }
        })

        document.getElementById('wide').addEventListener('click', e => {
            team_runs++;
            striker.total_runs++;
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
            if (!first_inning) {
                let t = document.querySelector('#team-runs span').innerText.split('-')
                if (team_runs >= parseInt(t[1])) {
                    inning_over();
                    return; // stop further updates
                }
            }
        })

        document.getElementById('no-ball').addEventListener('click', e => {
            team_runs++;
            striker.total_runs++;
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
            if (!first_inning) {
                let t = document.querySelector('#team-runs span').innerText.split('-')
                if (team_runs >= parseInt(t[1])) {
                    inning_over();
                    return; // stop further updates
                }
            }
        })

        document.getElementById('re-ball').addEventListener('click', e => {
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
        })

        document.getElementById('str-out').addEventListener('click', async e => {
            if (!batting_team) {
                Team_A.forEach(p => {
                    try {
                        if (!non_striker.id == "") {
                            if (p.id == non_striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_A.indexOf(p) + '"]').remove();
                            }
                        }
                        if (p.id == striker.id) {
                            document.getElementById('batsmen').querySelector('option[value="' + Team_A.indexOf(p) + '"]').remove();
                        }
                    }
                    catch { }
                });
            }
            else {
                Team_B.forEach(p => {
                    try {
                        if (!non_striker.id == "") {
                            if (p.id == non_striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_B.indexOf(p) + '"]').remove();
                            }
                        }
                        if (p.id == striker.id) {
                            document.getElementById('batsmen').querySelector('option[value="' + Team_B.indexOf(p) + '"]').remove();
                        }
                    }
                    catch { }
                });
            }
            bowler.total_wickets++
            wickets++
            document.getElementById("overlay").classList.add("active")
            document.getElementById("overlay").removeAttribute("onclick")
            document.getElementById("menu").removeAttribute("onclick")
            document.getElementById("bat-select").style.display = "block";

            await new Promise(r => {
                document.getElementById("bat-select").addEventListener("submit", i => {
                    i.preventDefault();
                    r();
                })
            });
            document.getElementById("bat-select").style.display = "none";
            players[striker.id] = striker;
            if (document.getElementById("batsmen").value == "") {
                if (!non_striker.id == "") {
                    striker = non_striker
                    non_striker = {
                        name: "No Non Striker!",
                        total_runs: "",
                        id: ""
                    }
                } else {
                    inning_over()
                    document.getElementById("overlay").classList.remove("active")
                    document.getElementById("overlay").setAttribute("onclick", "toggleSidebar()")
                    document.getElementById("menu").setAttribute("onclick", "toggleSidebar()")
                    return;
                }
            }
            else {
                if (batting_team) {
                    striker = Team_B[document.getElementById("batsmen").value]
                }
                else {
                    striker = Team_A[document.getElementById("batsmen").value]
                }
            }
            if (balls == 5) {
                document.getElementById("bowler-select").style.display = "block"

                await new Promise(res => {
                    document.getElementById("bowler-select").addEventListener("submit", e => {
                        e.preventDefault()
                        res()
                    })
                })

                bowler.total_overs++
                players[bowler.id] = bowler

                if (batting_team) {
                    bowler = Team_A[document.getElementById("bowlers").value]
                }
                else {
                    bowler = Team_B[document.getElementById("bowlers").value]
                }
                document.getElementById("bowler-select").style.display = "none"
                balls = -1
                if (!non_striker.id == "") {
                    temp = striker
                    striker = non_striker
                    non_striker = temp
                }
            }

            balls++;


            document.getElementById("overlay").classList.remove("active")
            document.getElementById("overlay").setAttribute("onclick", "toggleSidebar()")
            document.getElementById("menu").setAttribute("onclick", "toggleSidebar()")
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
            if (!first_inning) {
                let t = document.querySelector('#team-runs span').innerText.split('-')
                if (team_runs >= parseInt(t[1])) {
                    inning_over();
                    return; // stop further updates
                }
            }
        })

        document.getElementById('nstr-out').addEventListener('click', async e => {
            if (!non_striker.id == "") {
                if (!batting_team) {
                    Team_A.forEach(p => {
                        try {
                            if (p.id == non_striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_A.indexOf(p) + '"]').remove();
                            }
                            if (p.id == striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_A.indexOf(p) + '"]').remove();
                            }
                        }
                        catch { }
                    });
                }
                else {
                    Team_B.forEach(p => {
                        try {
                            if (p.id == non_striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_B.indexOf(p) + '"]').remove();
                            }
                            if (p.id == striker.id) {
                                document.getElementById('batsmen').querySelector('option[value="' + Team_B.indexOf(p) + '"]').remove();
                            }
                        }
                        catch { }
                    });
                }
                bowler.total_wickets++
                wickets++
                document.getElementById("overlay").classList.add("active")
                document.getElementById("overlay").removeAttribute("onclick")
                document.getElementById("menu").removeAttribute("onclick")
                document.getElementById("bat-select").style.display = "block";

                await new Promise(r => {
                    document.getElementById("bat-select").addEventListener("submit", i => {
                        i.preventDefault();
                        r();
                    })
                });
                document.getElementById("bat-select").style.display = "none";
                players[non_striker.id] = non_striker;

                if (document.getElementById("batsmen").value == "") {
                    non_striker = {
                        name: "No Non Striker!",
                        total_runs: "",
                        id: ""
                    }
                }
                else {
                    if (batting_team) {
                        non_striker = Team_B[document.getElementById("batsmen").value]
                    }
                    else {
                        non_striker = Team_A[document.getElementById("batsmen").value]
                    }

                    if (balls == 5) {
                        document.getElementById("bowler-select").style.display = "block"

                        await new Promise(res => {
                            document.getElementById("bowler-select").addEventListener("submit", e => {
                                e.preventDefault()
                                res()
                            })
                        })

                        bowler.total_overs++
                        players[bowler.id] = bowler

                        if (batting_team) {
                            bowler = Team_A[document.getElementById("bowlers").value]
                        }
                        else {
                            bowler = Team_B[document.getElementById("bowlers").value]
                        }
                        document.getElementById("bowler-select").style.display = "none"
                        balls = -1
                        if (!non_striker.id == "") {
                            temp = striker
                            striker = non_striker
                            non_striker = temp
                        }
                    }

                    balls++;

                }
                document.getElementById("overlay").classList.remove("active")
                document.getElementById("overlay").setAttribute("onclick", "toggleSidebar()")
                document.getElementById("menu").setAttribute("onclick", "toggleSidebar()")
            }
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
            if (!first_inning) {
                let t = document.querySelector('#team-runs span').innerText.split('-')
                if (team_runs >= parseInt(t[1])) {
                    inning_over();
                    return; // stop further updates
                }
            }
        })

        document.getElementById('strike-change').addEventListener('click', e => {
            if (!non_striker.id == "") {
                temp = striker
                striker = non_striker
                non_striker = temp
            }
            updateScoresUI(team_runs, striker.total_runs, non_striker.total_runs, wickets, balls, striker.name, non_striker.name, bowler.name, players, plyrs, first_inning)
        })

        document.getElementById("inning-over").addEventListener("click", e => {
            inning_over()
        });

    })

    function updateScoresUI(team_runs, str_runs, nstr_runs, wickets, balls, str_name, nstr_name, bowler_name, players, plyrs, tgmode) {

        document.getElementById('striker-score').innerHTML = '<span style="margin-left: 20%; font-size: small; font-weight: 500;">0</span>';
        document.getElementById('non-striker-score').innerHTML = '<span style="margin-left: 21%; font-size: small; font-weight: 500;">0</span>';
        document.getElementById('bowler-score').innerHTML = '<span style="margin-left: 20%; font-size: small; font-weight: 500;">0</span>';

        document.getElementById('striker-score').innerHTML = str_name + document.getElementById('striker-score').innerHTML;
        document.getElementById('non-striker-score').innerHTML = nstr_name + document.getElementById('non-striker-score').innerHTML;
        document.getElementById('bowler-score').innerHTML = bowler_name + document.getElementById('bowler-score').innerHTML;

        document.querySelector('#striker-score span').textContent = str_runs;
        document.querySelector('#non-striker-score span').textContent = nstr_runs;
        document.querySelector('#bowler-score span').textContent = balls;
        if (tgmode) {
            document.querySelector('#team-runs span').innerText = team_runs + '-' + wickets
        } else {
            let t = document.querySelector('#team-runs span').innerText.split('-')
            document.querySelector('#team-runs span').innerText = team_runs + '-' + t[1]
        }
    }

}



function mergePlayerStats(base, live) {
    return {
        ...base,
        total_runs: base.total_runs + live.total_runs,
        total_wickets: base.total_wickets + live.total_wickets,
        total_sixes: base.total_sixes + live.total_sixes,
        total_fours: base.total_fours + live.total_fours,
        total_overs: base.total_overs + live.total_overs,
    };
}


document.getElementById('striker').addEventListener('change', e => {
    document.getElementById('non-striker').innerHTML = document.getElementById('striker').innerHTML;
    document.getElementById('non-striker').querySelector('option[value="' + document.getElementById('striker').value + '"]').remove();
})

function showplayermenu(bool) {
    if (bool) {
        document.getElementById("player-menu").style.display = "block";
    } else {
        document.getElementById("player-menu").style.display = "none";
        document.getElementById("player-name").value = "";
    }
}
document.getElementById("player-menu").addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("player-name").value;
    fetch(API_URL + "/add-player",
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 'group_id': getCookie("id"), 'name': name })
        }
    )
        .then(async res => {
            if (!res.ok) {
                body = await res.text()
                alert(body)
            }
        })
    window.location.reload();
})

function filltablerows() {
    fetch(API_URL + "/get-players/" + getCookie("id"))
        .then(async res => {
            if (!res.ok) {
                const error = await res.text();
                alert('An Error Occurred: ' + error);
                throw new Error(error);
            }
            return res.json();
        })
        .then(result => {
            const tableBody = document.querySelector("#player-table tbody");
            tableBody.innerHTML = "";

            for (const player of result) {
                const row = tableBody.insertRow();
                row.classList.add("table-row");
                row.insertCell(0).textContent = player.name;

                const btn = row.insertCell(1);
                btn.textContent = "Remove";
                btn.classList.add("btn-delete");
                btn.addEventListener("click", () => {
                    fetch(API_URL + "/remove-player", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 'id': player.id })
                    }).then(() => window.location.reload());
                });
            }

            sessionStorage.setItem("players", JSON.stringify(result));

            // ✅ Moved here so it's run only after players are loaded
            renderScoreTable(result);
        });
}

function renderScoreTable(players) {
    const table = document.querySelector('#score-table tbody');
    table.innerHTML = "";
    players.forEach(player => {
        const row = table.insertRow();
        row.insertCell(0).textContent = player.name;
        row.insertCell(1).textContent = player.total_runs;
        row.insertCell(2).textContent = player.total_wickets;
        row.insertCell(3).textContent = player.bat_average;
        row.insertCell(4).textContent = player.total_matches;
    });
}
function moveItem(button, targetId) {
    const li = button.closest('li');
    const itemId = li.getAttribute('data-id');

    // Prevent duplicates
    if (document.querySelector(`#${targetId} li[data-id="${itemId}"]`)) return;

    const clone = li.cloneNode(true);
    clone.querySelector('span').innerHTML = `<button class="list-button" onclick="removeItem(this)">Remove</button>`;
    document.getElementById(targetId).appendChild(clone);
    li.remove();
}

function removeItem(button) {
    const li = button.closest('li');
    const itemId = li.getAttribute('data-id');
    const itemText = li.childNodes[0].textContent.trim();

    // Recreate the source list item with move buttons
    const newLi = document.createElement('li');
    newLi.setAttribute('data-id', itemId);
    newLi.classList.add('list_item')
    newLi.innerHTML = `${itemText} <span>
      <button class="list-button" onclick="moveItem(this, 'team-a')">To Team A</button>
      <button class="list-button" onclick="moveItem(this, 'team-b')">To Team B</button>
    </span>`;

    document.getElementById('sourceList').appendChild(newLi);
    li.remove();
}
