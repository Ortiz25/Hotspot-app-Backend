import * as dotenv from "dotenv";
dotenv.config();
import mysql2 from "mysql2";
import mysql from "mysql";

const dbConfig = {
  host: "165.22.206.135",
  user: "nodeapp",
  password: process.env.MYSQLDB_PASSWORD,
  database: "radius",
  port: 3306,
};
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "165.22.206.135",
  user: "nodeapp",
  password: process.env.MYSQLDB_PASSWORD,
  database: "radius",
});

export async function createUserDB(user) {
  const db = mysql2.createConnection(dbConfig);
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

  // Check whether user exists
  db.query(
    "SELECT * FROM radcheck WHERE username = ?",
    [user],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        return;
      } else {
        addUser(user);
        db.end();
        return;
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
  // Check if the user already has a Mikrotik-Rate-Limit entry in radreply
  const checkQuery = `SELECT id FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;

  db.query(checkQuery, [user], (checkError, checkResults) => {
    if (checkError) {
      console.error("Error checking radreply:", checkError);
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
      });
    }
  });
}

export function bundleLimit(bundle, user) {
  const db = mysql2.createConnection(dbConfig);

  // Check if the user already has a Mikrotik-Recv-Limit entry in radreply
  const checkQuery = `SELECT * FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;

  db.query(checkQuery, [user], (checkError, checkResults) => {
    console.log(checkResults);

    if (checkError) console.log("Check Error", checkError);

    if (checkResults.length > 0) {
      const updateQuery = `UPDATE radreply SET value = value + ?, last_update_time = NOW() WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;
      db.query(updateQuery, [bundle, user], (updateError, result) => {
        if (updateError) {
          console.log("Error updating", updateError);
          console.error(updateError);
        } else {
          console.log(result);
          console.log(`Mikrotik-Recv-Limit updated for user ${user}`);
        }
        // Close the MySQL connection
        db.end();
        return;
      });
    } else {
      // Insert a new Recv Limit entry
      const insertQuery = `INSERT INTO radreply (username, attribute, op, value, last_update_time ) VALUES (?, 'Mikrotik-Recv-Limit', ':=', ?, NOW())`;

      db.query(insertQuery, [user, bundle], (insertError, insertResults) => {
        if (insertError) {
          console.error("Error inserting radreply:", insertError);
        } else {
          console.log(insertResults);
          console.log(`Mikrotik-Recv-Limit added for user ${user}`);
        }

        // Close the MySQL connection
        db.end();
        return;
      });
    }
  });
}

export function QueryBundleBalance(user, res) {
  const db = mysql2.createConnection(dbConfig);

  // Query the Mikrotik-Recv-Limit attribute balance
  const queryUsage = `SELECT acctinputoctets, acctoutputoctets FROM radacct
  WHERE username =  ?
  ORDER BY acctstarttime DESC
  LIMIT 1;`;

  db.query(queryUsage, [user], async (queryError, results) => {
    console.log("Results", results);
    if (queryError) {
      console.error("Error querying radacct:", queryError);
    }
    if (results?.length > 0) {
      const inputOctets = results[0].acctinputoctets;
      const usedData = inputOctets;
      console.log("used Data", usedData);
      const checkQuery = `SELECT * FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;
      db.query(checkQuery, [user], (error, result) => {
        console.log("Results", result);

        if (error) console.log(error);
        if (usedData > result[0]?.value) {
          console.log(result[0]?.value);
          const deleteQuery = `DELETE FROM radreply  WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;
          db.query(deleteQuery, [user], (error, result) => {
            if (error) console.error(error);
            if (result) {
              console.log(result);
            }
          });
        } else {
          const bundleBalance = result[0]?.value - usedData;
          console.log("Balance", bundleBalance);

          res.json({ bundleBalance: bundleBalance ? bundleBalance : 0 });
          db.end();
          return;
        }
      });
    } else {
      const checkQuery = `SELECT * FROM radreply WHERE username = ? AND attribute = 'Mikrotik-Recv-Limit'`;
      db.query(checkQuery, [user], (error, result) => {
        console.log("Results", result);
        res.json({ bundleBalance: result[0]?.value });
      });
      console.log("less than zero");

      db.end();
      return;
    }
  });
}
