import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2";
import dgram from "dgram";
import radius from "radius";
import axios from "axios";

const dbConfig = {
  host: "108.181.203.124",
  user: "node",
  password: process.env.MYSQLDB_PASSWORD,
  database: "radius",
  port: 3306,
};

export function createUserDB(user) {
  const db = mysql.createConnection(dbConfig);

  function addUser(user) {
    db.query(
      "INSERT INTO radcheck (username, attribute, op, value) VALUES (?, ?, ?, ?)",
      [user, "Cleartext-Password", ":=", "sam"],
      (err, result) => {
        console.log(user);
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

  db.query(
    "SELECT * FROM radcheck WHERE username = ?",
    [user],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        console.log("user already exists");
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

            // Close the MySQL connection
            db.end();
          }
        );
      } else {
        // Insert a new session timeout entry
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

            // Close the MySQL connection
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
  GROUP BY username
  ORDER BY acctstarttime DESC
  LIMIT 1;`;

  db.query(query, [user], async (queryError, results) => {
    console.log(user);
    if (queryError) {
      console.error("Error querying radacct:", queryError);
    } else if (results.length > 0) {
      console.log(results);
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

    // Close the MySQL connection
    db.end();
  });
}

export function accessRequest() {
  // Create a UDP socket
  const server = dgram.createSocket("udp4");

  // Define the RADIUS request packet as a Buffer
  const packetAccess = radius.encode({
    code: "Access-Request",
    secret: "test123",
    AuthType: "HTTP-PAP",

    attributes: [
      ["User-Name", "0726500307"],
      ["User-Password", "sam"],
      ["Service-Type", "Login-User"],
    ],
  });

  // Replace '127.0.0.1' and 1812 with the RADIUS server's IP address and port
  const serverIP = "192.168.8.191";
  const serverPortAccess = 1812;

  // Send the RADIUS request packet to the RADIUS server
  server.send(packetAccess, serverPortAccess, serverIP, (error) => {
    if (error) {
      console.error("Error sending RADIUS request:", error);
    } else {
      console.log("RADIUS Access request sent successfully.");
    }

    // Close the UDP socket when done
    server.close();
  });
}

// Create a function to perform HTTP-PAP authentication
export async function httpPapAuth(user) {
  try {
    // Define FreeRADIUS server details
    const radiusServerURL = "http://192.168.8.191:1812"; // Replace with your RADIUS server URL
    const radiusSharedSecret = "test123"; // Replace with your RADIUS server shared secret
    // Create an Axios instance with RADIUS server details
    const axiosInstance = axios.create({
      baseURL: radiusServerURL,
      timeout: 5000, // Adjust the timeout as needed
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    // Build the RADIUS Access-Request packet with PAP credentials
    const radiusPacket = radius.encode({
      "User-Name": user.username,
      "User-Password": user.password,
      "NAS-IP-Address": "192.168.8.153", // Replace with your NAS IP address
      "NAS-Port": 0, // Replace with your NAS port number
    });

    // Send the RADIUS Access-Request packet with PAP authentication
    const response = await axiosInstance.post("/rad_auth", radiusPacket, {
      auth: {
        username: "radclient",
        password: radiusSharedSecret,
      },
    });

    // Check the response for success or failure
    if (response.status === 200 && response.data.code === "Access-Accept") {
      console.log(`Authentication succeeded for user: ${username}`);
    } else {
      console.error(`Authentication failed for user: ${username}`);
    }
  } catch (error) {
    console.error(`Error during authentication: ${error.message}`);
  }
}

// Call the authentication function
// httpPapAuth();
