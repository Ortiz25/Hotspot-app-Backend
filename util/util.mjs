import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2";

const dbConfig = {
  host: "108.181.203.124",
  user: "node",
  password: process.env.MYSQLDB_PASSWORD,
  database: "radius",
  port: 3306,
};

export function createUserDB(user) {
  const db = mysql.createConnection(dbConfig);

  // add user function
  function addUser(user) {
    db.query(
      "INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)",
      [user, "Cleartext-Password", ":=", "password"],
      (err, result) => {
        console.log("User created:", result);
      }
    );
  }

  db.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      throw err;
    }
    console.log("Connected to the database");
  });

  // Check whether user exists
  db.query(
    "SELECT * FROM radcheck WHERE username = ?",
    [user],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        db.end((err) => {
          if (err) {
            console.error("Error closing the database connection:", err);
          } else {
            console.log("Database connection closed");
          }
        });
      } else {
        addUser(user);
        db.end((err) => {
          if (err) {
            console.error("Error closing the database connection:", err);
          } else {
            console.log("Database connection closed");
          }
        });
      }
    }
  );
}

export function userSessionTimeOut(accessTimeSeconds, user) {
  const db = mysql.createConnection(dbConfig);

  // Connect to the MySQL database
  db.connect((err) => {
    if (err) {
      console.error("Error connecting to MySQL:", err);
      return;
    }

    console.log("Connected to MySQL");

    // Check if the user already has a session timeout entry in radreply
    const checkQuery = `SELECT id FROM radreply WHERE username = ? AND attribute = 'Session-Timeout'`;

    db.query(checkQuery, [user], (checkError, checkResults) => {
      if (checkError) {
        console.error("Error checking radreply:", checkError);
        db.end();
        return;
      }

      if (checkResults.length > 0) {
        // Update the existing session timeout entry
        const updateQuery = `UPDATE radreply SET value = ? WHERE username = ? AND attribute = 'Session-Timeout'`;

        db.query(
          updateQuery,
          [accessTimeSeconds, user],
          (updateError, updateResults) => {
            if (updateError) {
              console.error("Error updating radreply:", updateError);
            } else {
              console.log(updateResults);
              console.log(`Session timeout updated for user ${user}`);
            }
            db.end();
          }
        );
      } else {
        // Insert a new session timeout
        const insertQuery = `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Session-Timeout', ':=', ?)`;

        db.query(
          insertQuery,
          [user, accessTimeSeconds],
          (insertError, insertResults) => {
            if (insertError) {
              console.error("Error inserting radreply:", insertError);
            } else {
              console.log(insertResults);
              console.log(`Session timeout added for user ${user}`);
            }
            db.end();
          }
        );
      }
    });
  });
}

export function revokeUser(user, rateLimit) {
  const db = mysql.createConnection(dbConfig);
  db.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      throw err;
    }
    console.log("Connected to the database");
  });

  // Check if the user already has a Mikrotik-Rate-Limit entry in radreply
  const checkQuery = `SELECT id FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Rate-Limit'`;

  db.query(checkQuery, [user], (checkError, checkResults) => {
    if (checkError) {
      console.error("Error checking radreply:", checkError);
      db.end();
      return;
    }

    if (checkResults.length > 0) {
      // Update the existing Rate Limit entry
      const updateQuery = `UPDATE radreply SET value = ? WHERE username = ? AND attribute = 'Mikrotik-Rate-Limit'`;

      db.query(updateQuery, [rateLimit, user], (updateError, updateResults) => {
        if (updateError) {
          console.error("Error updating radreply:", updateError);
        } else {
          console.log(updateResults);
          console.log(`Mikrotik Rate Limit added updated for user ${user}`);
        }

        // Close the MySQL connection
        db.end();
      });
    } else {
      // Insert a new Rate Limit entry
      console.log(checkResults);
      const insertQuery = `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Mikrotik-Rate-Limit', ':=', ?)`;

      db.query(insertQuery, [user, rateLimit], (insertError, insertResults) => {
        if (insertError) {
          console.error("Error inserting radreply:", insertError);
        } else {
          console.log(insertResults);
          console.log(`Mikrotik Rate Limit added for user ${user}`);
        }

        // Close the MySQL connection
        db.end();
      });
    }
  });
}

export function bundleLimit(bundle, user) {
  const db = mysql.createConnection(dbConfig);
  db.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      throw err;
    }
    console.log("Connected to the database");
  });

  // Check if the user already has a Mikrotik-Recv-Limit entry in radreply
  const checkQuery = `SELECT id FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;

  db.query(checkQuery, [user], (checkError, checkResults) => {
    if (checkError) {
      console.error("Error checking radreply:", checkError);
      db.end();
      return;
    }

    if (checkResults.length > 0) {
      // Update the existing Rate Recv entry
      const updateQuery = `UPDATE radreply SET value = ? WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;

      db.query(updateQuery, [bundle, user], (updateError, updateResults) => {
        if (updateError) {
          console.error("Error updating radreply:", updateError);
        } else {
          console.log(updateResults);
          console.log(`Mikrotik-Recv-Limit updated for user ${user}`);
        }

        // Close the MySQL connection
        db.end();
      });
    } else {
      // Insert a new Recv Limit entry
      console.log(checkResults);
      const insertQuery = `INSERT INTO radreply (username, attribute, op, value) VALUES (?, 'Mikrotik-Recv-Limit', '=', ?)`;

      db.query(insertQuery, [user, bundle], (insertError, insertResults) => {
        if (insertError) {
          console.error("Error inserting radreply:", insertError);
        } else {
          console.log(insertResults);
          console.log(`Mikrotik-Recv-Limit added for user ${user}`);
        }

        // Close the MySQL connection
        db.end();
      });
    }
  });
}

export function QueryBundleBalance(user, res) {
  const db = mysql.createConnection(dbConfig);

  // Connect to the MySQL database
  db.connect((err) => {
    if (err) {
      console.error("Error connecting to MySQL:", err);
      return;
    }
  });

  console.log("Connected to MySQL");

  // Query the Mikrotik-Recv-Limit attribute balance
  const query = `SELECT acctinputoctets, acctoutputoctets FROM radacct
  WHERE username =  ?
  ORDER BY acctstarttime DESC
  LIMIT 1;`;

  db.query(query, [user], async (queryError, results) => {
    if (queryError) {
      console.error("Error querying radacct:", queryError);
    } else if (results.length > 0) {
      const inputOctets = results[0].acctinputoctets;
      const outputOctets = results[0].acctoutputoctets;
      console.log(`Mikrotik-Recv-Limit balance for user ${user}:`);
      console.log(`Input Octets: ${inputOctets}`);
      res.json({ bundleBalance: inputOctets });
      console.log(`Output Octets: ${outputOctets}`);
    } else {
      console.log(`No Mikrotik-Recv-Limit balance found for user ${user}`);
      res.json({ message: "limit does not exist" });
    }

    db.end();
  });
}
