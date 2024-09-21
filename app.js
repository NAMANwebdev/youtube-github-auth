const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Log environment variables
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET);
console.log('Callback URL:', process.env.CALLBACK_URL);

// Home route
app.get('/', (req, res) => {
  console.log("Home route accessed");
  res.render('index');
});

// Middleware for session handling
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken; // Store access token in profile
    done(null, profile);
  }
));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Route to start authentication
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.readonly']
  })
);

// Callback route
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/protected');
  }
);

// Protected route
app.get('/protected', (req, res) => {
  if (req.isAuthenticated()) {
    checkYouTubeSubscription(req.user.accessToken)
      .then(isSubscribed => {
        if (isSubscribed) {
          res.render('protected', { subscribed: true });
        } else {
          res.render('protected', { subscribed: false });
        }
      })
      .catch(err => {
        console.error(err);
        res.render('error', { message: 'Error checking subscription.' });
      });
  } else {
    res.redirect('/');
  }
});

// Function to check YouTube subscription
async function checkYouTubeSubscription(accessToken) {
  const response = await axios.get('https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  const subscriptions = response.data.items;
  const targetChannelId = process.env.TARGET_CHANNEL_ID; // Replace with your target channel ID
  return subscriptions.some(sub => sub.snippet.resourceId.channelId === targetChannelId);
}


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
