//index.js
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: "123456",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisited() {
  try {
    const result = await db.query(
      "SELECT country_code FROM visited_countries WHERE user_id = $1",
      [currentUserId]
    );
    // console.log(result);
    let countries = [];
    result.rows.forEach((country) => {
      countries.push(country.country_code);
    });
    console.log(countries);
    return countries;
  } catch (error) {
    console.error(error.message);
    console.log("No countries visited");
  }
}

async function getCurrentUser() {
  const user = await db.query("SELECT * FROM users");
  users = user.rows;
  try {
    if (user.rows.length > 0) {
      const result = await db.query(
        "SELECT name, color FROM users WHERE id = $1",
        [currentUserId]
      );
      return result.rows[0];
    } else {
      throw new Error("No users present");
    }
  } catch (error) {
    console.log(error.message);
    return false;
  }
}

app.get("/", async (req, res) => {
  const currentUser = await getCurrentUser();
  const countries = await checkVisited();
  if (currentUser == false) {
    res.render("index.ejs", {
      countries: countries,
      users: users,
      color: "teal",
    });
  } else {
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      enterCountryBlock: true,
    });
  }
});

app.get("/homeRouteWithErrorMessage", async (req, res) => {
  const error = req.query.error;
  const currentUser = await getCurrentUser();
  const countries = await checkVisited();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
    error: error,
    enterCountryBlock: true,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body.country;

  try {
    // const result = await db.query(
    //   "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
    //   [input.toLowerCase()]
    // );
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );
    if (result.rows.length > 0) {
      const countryCode = result.rows[0].country_code;
      const isCountryPresent = await db.query(
        "SELECT * FROM visited_countries WHERE country_code = $1 AND user_id = $2;",
        [countryCode, currentUserId]
      );
      try {
        if (isCountryPresent.rows.length == 0) {
          await db.query(
            "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2);",
            [countryCode, currentUserId]
          );
          res.redirect("/");
        } else {
          throw new Error("Country already exists!");
        }
      } catch (err) {
        const error = err.message;
        console.log(err.message);
        res.redirect(
          `/homeRouteWithErrorMessage?error=${encodeURIComponent(error)}`
        );
      }
    } else {
      throw new Error("Invalid country name, please try again");
    }
  } catch (err) {
    const error = err.message;
    console.log(err.message);
    res.redirect(
      `/homeRouteWithErrorMessage?error=${encodeURIComponent(error)}`
    );
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add == "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  const main1 = async () => {
    res.render("new.ejs", {
      name: name,
      errorMessage: "Please select a color to continue",
    });
  };

  if (!color) {
    await main1();
  } else {
    console.log("both name and color fetched");
    const newUser = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;",
      [name, color]
    );

    console.log("user data inserted in users table");
    currentUserId = newUser.rows[0].id;
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// index.ejs
