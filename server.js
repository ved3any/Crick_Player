const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;


// Connect to your existing MySQL database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'P@ssw0rd',
  database: 'crick_player_db', // change this to match your DB name
  connectTimeout: 100000
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

app.use(cors());
app.use(bodyParser.json());

// Register endpoint
app.post('/register', async (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const { username, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
    db.query(query, [username, email, hash], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('User already exists or error occurred');
      }

      db.query("SELECT id FROM users where name = ? AND email = ?", [username, email], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send('User Not Found!');
        }
        res.status(200).send(`${result[0].id}`);
      });

    });
  } catch (err) {
    res.status(500).send('Server error' + err);
  }
});

app.get('/data/:id', async (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  try {
    const userId = req.params.id;
    db.query("SELECT id,name,email FROM users WHERE id = ?", [userId], (err, result) => {
      const user = result[0];

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' + error });
  }
});

// Login endpoint
app.post('/login', (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = ?`;
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).send('Error');
    if (results.length == 0) return res.status(401).send('User not found');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).send('Incorrect password');
    res.status(200).send(String(user.id));
  });
});

app.post('/add-player', (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const { group_id, name } = req.body;
  const query = `
    INSERT INTO players (
      name, group_id, total_runs, total_wickets, bat_average,
      total_overs, total_matches, total_sixes, total_fours
    ) VALUES (?, ?, 0, 0, 0.0, 0, 0, 0, 0);
  `;

  db.query(query, [name, group_id], (err, result) => {
    if (err) {
      return res.status(500).send('Internal Server Error: Cannot Add Player');
    }
    res.status(200).send("Player Addition Successful");
  });
});

app.post('/remove-player', (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const { id } = req.body;
  query = "DELETE FROM players WHERE id = ?;"

  db.query(query, [id], async (err, result) => {
    if (err) return res.status(500).send('Internal Server Error Cannot Remove Player');
    res.status(200).send("Player Removal Successful");
  });
})

app.get('/get-players/:id', async (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const group_id = req.params.id;

  db.query('SELECT * FROM players WHERE group_id = ?', [group_id], (err, result) => {
    if (err) return res.status(501).send('Cannot Find Players');
    return res.status(200).json(result); // Send JSON directly
  });
});


app.post('/update-player-scores', async (req, res) => {
  res.set("ngrok-skip-browser-warning", true);
  const { plyrs } = req.body;
  const players = JSON.parse(plyrs);
  const query = `
    UPDATE players 
    SET total_runs = ?, total_wickets = ?, bat_average = ?,
    total_overs = ?, total_matches = ?, total_sixes = ?, total_fours = ?
    WHERE id = ?
  `;

  try {
    const updatePromises = players.map(player => {
      return new Promise((resolve, reject) => {
        const values = [
          player.total_runs,
          player.total_wickets,
          ((player.total_matches + 1) === 0 ? 0 : player.total_runs / player.total_matches),
          player.total_overs,
          (player.total_matches + 1),
          player.total_sixes,
          player.total_fours,
          player.id
        ];

        db.query(query, values, (err, result) => {
          if (err) {
            reject(`Failed to update ${player.name}`);
          } else {
            resolve();
          }
        });
      });
    });

    await Promise.all(updatePromises);
    res.status(200).send("Player Update Successful");

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error: " + error);
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
