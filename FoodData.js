const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

require("dotenv").config();
const port = process.env.PORT_FOOD_DATA || 4000; // Fallback to 4000 if not set


// const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(async function (req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

// gets the inventory table data from cars Database from mySQL
app.get("/food_tracker", async function (req, res) {
  // name of table in Database mysql (/inventory)
  try {
    const result = await req.db.query(
      "SELECT * FROM lone_wolf_fitness.food_tracker WHERE deleted_flag = 0"
    ); //query in sql

    res.json({
      success: true,
      message: "Food data retrieved",
      data: result[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
//like a HTTP request

//Sets rules
app.use(async function (req, res, next) {
    try {
      console.log("Middleware after the get /food_tracker");
  
      await next();
    } catch (err) {}
  });
  
  

//Creates new workout in database
app.post("/food_tracker", async function (req, res) {
  console.log("Received data:", req.body); // Check the received data
  try {
    const { food, calories, protein, fat, carbs } = req.body;

    const query = await req.db.query(
      `INSERT INTO food_tracker (date, food, calories, protein, fat, carbs) 
         VALUES (CURRENT_DATE, :food, :calories, :protein, :fat, :carbs)`,
      {
        food,
        calories,
        protein,
        fat,
        carbs,
      }
    );

    res.json({
      success: true,
      message: " Food entry successfully created",
      data: null,
    });
  } catch (err) {
    console.error("Error inserting data:", err);
    res.json({ success: false, message: "Internal Server Error", data: null });
  }
});

// deletes car from db
app.delete("/food_tracker/:id", async function (req, res) {
  try {
    const id = req.params.id; //Requesting an id in the URL

    const updateResult = await req.db.query(
      "UPDATE lone_wolf_fitness.food_tracker SET deleted_flag = 1 WHERE id = :id",
      {id}
    );

    const resultSetHeader = updateResult[0];
    const affectedRows = resultSetHeader ? resultSetHeader.affectedRows : 0;

    if (affectedRows > 0) {
      res.json({ success: true, msg: "Food entry deleted successfully" });
    } else {
      res.status(404).json({ success: false, msg: "Food entry not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
});

app.put("/food_tracker/:id", async function (req, res) {
  const id = req.params.id; // Extract ID from the URL parameters
  const { food, calories, protein, fat, carbs} = req.body;

  console.log("Updating ID:", id);
  console.log("Update Data:", req.body);

  try {
    const [result] = await req.db.query(
      `UPDATE food_tracker 
         SET food = :food, calories = :calories, protein = :protein, fat = :fat, carbs = :carbs
         WHERE id = :id`,
      {food, calories, protein, fat, carbs, id}
    );

    console.log("Update Result:", result);

    if (result.affectedRows === 0) {
      console.log("No rows updated, likely no matching ID.");
      return res
        .status(404)
        .json({ success: false, msg: "Workout not found", data: null });
    }

    res.json({
      success: true,
      msg: "Workout successfully updated",
      data: null,
    });
  } catch (err) {
    console.error("Error during update:", err);
    res
      .status(500)
      .json({ success: false, message: "Internal Server Error", data: null });
  }
});

app.listen(port, () =>
  console.log(`212 API Example listening on http://localhost:${port}`)
);
