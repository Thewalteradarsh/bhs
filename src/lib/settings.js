// User settings (language preferences + favourite artists) — persisted to localStorage

const SETTINGS_KEY = 'hear_settings';

const DEFAULT_SETTINGS = {
  userName: '',             // optional user name
  primaryLang: 'malayalam',
  secondaryLang: '',        // optional
  favoriteArtists: [],      // array of artist name strings
  
  // Playback & Quality settings
  dataSaver: false,
  audioQuality: 'high',     // 'low', 'normal', 'high', 'very_high'
  autoplay: true,
  gaplessPlayback: true,
  explicitContent: true,
};

export const LANGUAGES = [
  { id: 'malayalam', label: 'Malayalam', flag: '🌴' },
  { id: 'tamil',     label: 'Tamil',     flag: '🎭' },
  { id: 'hindi',     label: 'Hindi',     flag: '🇮🇳' },
  { id: 'telugu',    label: 'Telugu',    flag: '🌟' },
  { id: 'kannada',   label: 'Kannada',   flag: '🏛️' },
  { id: 'english',   label: 'English',   flag: '🎵' },
  { id: 'punjabi',   label: 'Punjabi',   flag: '🎺' },
];

// Curated list of popular Indian artists across all languages & genres
export const INDIAN_ARTISTS = [
  // ── Malayalam ────────────────────────────────────────────────
  { name: 'Sid Sriram',          lang: 'Malayalam / Tamil' },
  { name: 'Vineeth Sreenivasan', lang: 'Malayalam' },
  { name: 'Haricharan',          lang: 'Malayalam / Tamil' },
  { name: 'K.S. Chithra',        lang: 'Malayalam' },
  { name: 'K.J. Yesudas',        lang: 'Malayalam' },
  { name: 'M.G. Sreekumar',      lang: 'Malayalam' },
  { name: 'Shreya Ghoshal',      lang: 'Multi-language' },
  { name: 'Sithara Krishnakumar',lang: 'Malayalam' },
  { name: 'Najim Arshad',        lang: 'Malayalam' },
  { name: 'Vijay Yesudas',       lang: 'Malayalam' },
  { name: 'Njandukalude Naattil Oridavela', lang: 'Malayalam' },
  { name: 'Bijibal',             lang: 'Malayalam' },
  { name: 'Gopi Sundar',         lang: 'Malayalam' },
  { name: 'M. Jayachandran',     lang: 'Malayalam' },
  { name: 'Deepak Dev',          lang: 'Malayalam' },
  { name: 'Vidhu Prathap',       lang: 'Malayalam' },
  { name: 'Rahul Raj',           lang: 'Malayalam' },
  { name: 'Rajesh Murugesan',    lang: 'Malayalam' },
  { name: 'Sushin Shyam',        lang: 'Malayalam' },
  { name: 'Govind Menon',        lang: 'Malayalam' },
  { name: 'Pradeep Kumar',       lang: 'Malayalam' },
  { name: 'Manjari',             lang: 'Malayalam' },
  { name: 'Sujatha Mohan',       lang: 'Malayalam' },
  { name: 'G. Venugopal',        lang: 'Malayalam' },
  { name: 'Madhu Balakrishnan',  lang: 'Malayalam' },

  // ── Tamil ────────────────────────────────────────────────────
  { name: 'Anirudh Ravichander', lang: 'Tamil' },
  { name: 'A.R. Rahman',         lang: 'Tamil / Hindi' },
  { name: 'Yuvan Shankar Raja',  lang: 'Tamil' },
  { name: 'Harris Jayaraj',      lang: 'Tamil' },
  { name: 'D. Imman',            lang: 'Tamil' },
  { name: 'Sathyaprakash',       lang: 'Tamil' },
  { name: 'Karthik',             lang: 'Tamil' },
  { name: 'Benny Dayal',         lang: 'Tamil / Hindi' },
  { name: 'Vijay Antony',        lang: 'Tamil' },
  { name: 'G.V. Prakash Kumar',  lang: 'Tamil' },
  { name: 'Jonita Gandhi',       lang: 'Tamil / Hindi' },
  { name: 'Leon James',          lang: 'Tamil' },
  { name: 'Sean Roldan',         lang: 'Tamil' },
  { name: 'Darbuka Siva',        lang: 'Tamil' },
  { name: 'Gana Bala',           lang: 'Tamil' },
  { name: 'Pradeep Kumar',       lang: 'Tamil' },
  { name: 'Velmurugan',          lang: 'Tamil' },
  { name: 'Pragathi Guruprasad', lang: 'Tamil' },
  { name: 'Shakthisree Gopalan', lang: 'Tamil' },
  { name: 'Chinmayi',            lang: 'Tamil' },

  // ── Hindi / Bollywood ───────────────────────────────────────
  { name: 'Arijit Singh',        lang: 'Hindi' },
  { name: 'Sonu Nigam',          lang: 'Hindi' },
  { name: 'Kumar Sanu',          lang: 'Hindi' },
  { name: 'Udit Narayan',        lang: 'Hindi' },
  { name: 'Mohammed Rafi',       lang: 'Hindi' },
  { name: 'Lata Mangeshkar',     lang: 'Hindi' },
  { name: 'Asha Bhosle',         lang: 'Hindi' },
  { name: 'Kishore Kumar',       lang: 'Hindi' },
  { name: 'Mukesh',              lang: 'Hindi' },
  { name: 'Himesh Reshammiya',   lang: 'Hindi' },
  { name: 'Mika Singh',          lang: 'Hindi' },
  { name: 'Sunidhi Chauhan',     lang: 'Hindi' },
  { name: 'Neha Kakkar',         lang: 'Hindi' },
  { name: 'Atif Aslam',          lang: 'Hindi' },
  { name: 'Darshan Raval',       lang: 'Hindi' },
  { name: 'Jubin Nautiyal',      lang: 'Hindi' },
  { name: 'Armaan Malik',        lang: 'Hindi' },
  { name: 'B Praak',             lang: 'Hindi' },
  { name: 'Guru Randhawa',       lang: 'Hindi / Punjabi' },
  { name: 'Badshah',             lang: 'Hindi' },
  { name: 'Yo Yo Honey Singh',   lang: 'Hindi / Punjabi' },
  { name: 'Jasleen Royal',       lang: 'Hindi' },
  { name: 'Prateek Kuhad',       lang: 'Hindi' },
  { name: 'Anuv Jain',           lang: 'Hindi' },
  { name: 'Ritviz',              lang: 'Hindi' },
  { name: 'The Local Train',     lang: 'Hindi' },
  { name: 'Vishal Mishra',       lang: 'Hindi' },
  { name: 'Sachet-Parampara',    lang: 'Hindi' },
  { name: 'Shashwat Singh',      lang: 'Hindi' },
  { name: 'Mohit Chauhan',       lang: 'Hindi' },
  { name: 'Lucky Ali',           lang: 'Hindi' },

  // ── Telugu ────────────────────────────────────────────────────
  { name: 'S.P. Balasubrahmanyam', lang: 'Telugu' },
  { name: 'Thaman S',            lang: 'Telugu' },
  { name: 'Devi Sri Prasad',     lang: 'Telugu' },
  { name: 'Mickey J Meyer',      lang: 'Telugu' },
  { name: 'Anup Rubens',         lang: 'Telugu' },
  { name: 'Sid Sriram',          lang: 'Telugu' },
  { name: 'Rahul Sipligunj',     lang: 'Telugu' },
  { name: 'Mangli',              lang: 'Telugu' },
  { name: 'Anurag Kulkarni',     lang: 'Telugu' },
  { name: 'Karthik',             lang: 'Telugu' },
  { name: 'Rita',                lang: 'Telugu' },
  { name: 'Aditi Paul',          lang: 'Telugu' },
  { name: 'Simha',               lang: 'Telugu' },

  // ── Kannada ──────────────────────────────────────────────────
  { name: 'Rajesh Krishnan',     lang: 'Kannada' },
  { name: 'V. Ravichandran',     lang: 'Kannada' },
  { name: 'Arjun Janya',         lang: 'Kannada' },
  { name: 'Ravi Basrur',         lang: 'Kannada' },
  { name: 'Charan Raj',          lang: 'Kannada' },
  { name: 'Gurukiran',           lang: 'Kannada' },
  { name: 'Hamsalekha',          lang: 'Kannada' },
  { name: 'B. Ajaneesh Loknath', lang: 'Kannada' },

  // ── Punjabi ──────────────────────────────────────────────────
  { name: 'Diljit Dosanjh',      lang: 'Punjabi' },
  { name: 'Sidhu Moosewala',     lang: 'Punjabi' },
  { name: 'AP Dhillon',          lang: 'Punjabi' },
  { name: 'Shubh',               lang: 'Punjabi' },
  { name: 'Karan Aujla',         lang: 'Punjabi' },
  { name: 'Ammy Virk',           lang: 'Punjabi' },
  { name: 'Harrdy Sandhu',       lang: 'Punjabi' },
  { name: 'Jasmine Sandlas',     lang: 'Punjabi' },
  { name: 'Nimrat Khaira',       lang: 'Punjabi' },
  { name: 'Parmish Verma',       lang: 'Punjabi' },
  { name: 'Jordan Sandhu',       lang: 'Punjabi' },
  { name: 'Gurnam Bhullar',      lang: 'Punjabi' },
];

export const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
};
