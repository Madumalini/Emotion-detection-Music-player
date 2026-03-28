require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
 const PORT = process.env.PORT || 3000;

// Start the Python emotion detection API if it isn't already running.
// This helps ensure the app can detect emotions without requiring a separate manual step.
function startPythonApi() {
  try {
    const pythonProcess = spawn('python', ['emotion_api.py'], {
      cwd: __dirname,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: true
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python emotion API:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
      console.warn(`Python emotion API stopped (code=${code}, signal=${signal})`);
    });
  } catch (err) {
    console.error('Error starting Python emotion API:', err);
  }
}

startPythonApi();

// In-memory user storage for testing
let users = [];
let userIdCounter = 1;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session - using memory store for testing
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/welcome');
});

app.get('/welcome', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('welcome');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { name, dob } = req.body;
  const user = users.find(u => u.name === name);
  if (user && await bcrypt.compare(dob, user.dobHash)) {
    req.session.userId = user.id;
    return res.redirect('/dashboard');
  }
  res.render('login', { error: 'Invalid name or date of birth' });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { name, dob } = req.body;
  if (!name || !dob) {
    return res.render('register', { error: 'Name and date of birth are required.' });
  }

  const existing = users.find(u => u.name === name);
  if (existing) {
    return res.render('register', { error: 'A user with that name already exists.' });
  }

  const dobHash = await bcrypt.hash(dob, 10);
  const user = {
    id: userIdCounter++,
    name,
    dobHash,
    bio: 'Hey there! I love music that matches my mood.',
    profilePic: 'https://via.placeholder.com/150/6366F1/FFFFFF?text=' + name.charAt(0).toUpperCase(), // Placeholder avatar
    friends: [],
    blocked: [],
    favourites: []
  };
  users.push(user);

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = users.find(u => u.id === req.session.userId);
  res.render('dashboard', { user, users });
});

app.post('/detect-emotion', async (req, res) => {
  const { image } = req.body;
  // Call Python API
  try {
    const response = await fetch('http://localhost:5001/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image })
    });

    if (!response.ok) {
      throw new Error(`Python API returned ${response.status}`);
    }

    const result = await response.json();
    return res.json(result);
  } catch (err) {
    console.error('Emotion detection error:', err);
    return res.json({ emotion: 'neutral', error: 'Emotion API unavailable. Ensure Python API is running.' });
  }
});

// Get songs from Downloads folder based on emotion
app.get('/get-songs/:emotion', (req, res) => {
  const emotion = req.params.emotion.toLowerCase();
  const emotionFolderMap = {
    happy: 'C:\\Users\\madu2\\Downloads\\HAPPY SONGS',
    sad: 'C:\\Users\\madu2\\Downloads\\SAD SONGS',
    neutral: 'C:\\Users\\madu2\\Downloads\\NEUTRAL SONGS',
    angry: 'C:\\Users\\madu2\\Downloads\\NEUTRAL SONGS' // fallback for angry to neutral
  };

  const folderPath = emotionFolderMap[emotion];
  
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.json({ songs: [], error: `No songs folder found for emotion: ${emotion}` });
  }

  try {
    const files = fs.readdirSync(folderPath);
    const audioFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.flac', '.ogg'].includes(ext);
    });

    const songs = audioFiles.map(file => ({
      title: path.basename(file, path.extname(file)),
      url: `/songs/${emotion}/${encodeURIComponent(file)}`,
      emotion: emotion
    }));

    console.log(`Found ${songs.length} songs for emotion: ${emotion}`);
    return res.json({ songs });
  } catch (err) {
    console.error('Error reading songs folder:', err);
    return res.json({ songs: [], error: err.message });
  }
});

// Stream audio file from Downloads
app.get('/songs/:emotion/:filename', (req, res) => {
  const emotion = req.params.emotion.toLowerCase();
  const filename = decodeURIComponent(req.params.filename);
  
  const emotionFolderMap = {
    happy: 'C:\\Users\\madu2\\Downloads\\HAPPY SONGS',
    sad: 'C:\\Users\\madu2\\Downloads\\SAD SONGS',
    neutral: 'C:\\Users\\madu2\\Downloads\\NEUTRAL SONGS',
    angry: 'C:\\Users\\madu2\\Downloads\\NEUTRAL SONGS'
  };

  const folderPath = emotionFolderMap[emotion];
  const filePath = path.join(folderPath, filename);

  // Security: ensure file is in the emotion folder
  const resolvedPath = path.resolve(filePath);
  const resolvedFolderPath = path.resolve(folderPath);
  
  if (!resolvedPath.startsWith(resolvedFolderPath)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  
  stream.on('error', (err) => {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Stream error' });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Profile and friends routes
app.get('/profile', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const user = users.find(u => u.id === req.session.userId);
  res.render('profile', { user, users });
});

app.post('/update-profile', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const { bio } = req.body;
  const user = users.find(u => u.id === req.session.userId);
  if (user) {
    user.bio = bio || user.bio;
  }
  res.redirect('/profile');
});

app.post('/add-friend/:friendId', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const friendId = parseInt(req.params.friendId);
  const user = users.find(u => u.id === req.session.userId);
  const friend = users.find(u => u.id === friendId);
  if (user && friend && !user.friends.includes(friendId) && !user.blocked.includes(friendId)) {
    user.friends.push(friendId);
  }
  res.redirect('/dashboard');
});

app.post('/block-user/:userId', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const blockId = parseInt(req.params.userId);
  const user = users.find(u => u.id === req.session.userId);
  if (user && !user.blocked.includes(blockId)) {
    user.blocked.push(blockId);
    // Remove from friends if blocked
    user.friends = user.friends.filter(id => id !== blockId);
  }
  res.redirect('/dashboard');
});

app.post('/favourite/:itemId', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  const itemId = req.params.itemId;
  const user = users.find(u => u.id === req.session.userId);
  if (user && !user.favourites.includes(itemId)) {
    user.favourites.push(itemId);
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});