// Topic packs for the imposter game.
// Each pack: display name + list of secret words.
// Packs are kept the same size (30 words) so no pack dominates the random pick.
const TOPICS = {
  food: {
    name: "Food & Drinks",
    words: [
      "Biryani", "Pizza", "Dosa", "Burger", "Momos", "Pani Puri", "Chocolate",
      "Ice Cream", "Maggi", "Samosa", "Pasta", "Sushi", "French Fries",
      "Butter Chicken", "Idli", "Sandwich", "Popcorn", "Jalebi", "Filter Coffee",
      "Bubble Tea", "Paratha", "Ramen", "Gulab Jamun", "Vada Pav", "Shawarma",
      "Pancakes", "Masala Chai", "Nutella", "Watermelon", "Cotton Candy"
    ]
  },
  animals: {
    name: "Animals",
    words: [
      "Elephant", "Penguin", "Tiger", "Kangaroo", "Octopus", "Giraffe", "Cobra",
      "Dolphin", "Owl", "Crocodile", "Panda", "Peacock", "Shark", "Camel",
      "Monkey", "Butterfly", "Tortoise", "Eagle", "Sloth", "Chameleon", "Horse",
      "Rabbit", "Lion", "Squirrel", "Mosquito", "Bat", "Jellyfish", "Hedgehog",
      "Flamingo", "Cockroach"
    ]
  },
  movies: {
    name: "Movies & TV",
    words: [
      "Avengers", "Harry Potter", "Baahubali", "Stranger Things", "Titanic",
      "3 Idiots", "Money Heist", "Interstellar", "KGF", "Friends", "Spider-Man",
      "Breaking Bad", "Dangal", "Squid Game", "Inception", "Jurassic Park",
      "Sholay", "The Office", "Batman", "Frozen", "RRR", "Game of Thrones",
      "Avatar", "Kung Fu Panda", "Joker", "Shrek", "Pushpa", "Naruto",
      "Wednesday", "Home Alone"
    ]
  },
  characters: {
    name: "Famous Characters",
    words: [
      "Sherlock Holmes", "Chhota Bheem", "Doraemon", "Mickey Mouse", "Iron Man",
      "Darth Vader", "Pikachu", "Tom and Jerry", "Scooby Doo", "Shinchan",
      "Popeye", "Superman", "Wonder Woman", "Hulk", "Elsa", "Minions",
      "SpongeBob", "Bugs Bunny", "Godzilla", "Terminator", "James Bond",
      "Hermione", "Yoda", "Winnie the Pooh", "Barbie", "Motu Patlu", "Oggy",
      "Captain America", "Gru", "Kermit the Frog"
    ]
  },
  music: {
    name: "Music",
    words: [
      "Guitar", "Piano", "Drums", "Violin", "Flute", "Tabla", "Saxophone",
      "Trumpet", "Ukulele", "DJ", "Karaoke", "Live Concert", "Rap Battle",
      "Opera", "Lo-fi", "Choir", "Jazz", "Heavy Metal", "Auto-Tune",
      "Music Video", "A.R. Rahman", "Taylor Swift", "BTS", "Arijit Singh",
      "Ed Sheeran", "Eminem", "Beatboxing", "Ringtone", "National Anthem",
      "Playlist"
    ]
  },
  videogames: {
    name: "Video Games",
    words: [
      "Minecraft", "GTA", "BGMI", "Free Fire", "FIFA", "Fortnite",
      "Call of Duty", "Among Us", "Super Mario", "Pokemon", "Roblox", "Valorant",
      "Candy Crush", "Subway Surfers", "Temple Run", "Angry Birds",
      "Clash of Clans", "Tetris", "The Sims", "Zelda", "Sonic", "Pac-Man",
      "Fall Guys", "Minesweeper", "Solitaire", "Joystick", "Speedrun",
      "Boss Fight", "Respawn", "Loot Box"
    ]
  },
  sports: {
    name: "Sports & Games",
    words: [
      "Cricket", "Football", "Chess", "Badminton", "Kabaddi", "Basketball",
      "Table Tennis", "Swimming", "Boxing", "Carrom", "Hockey", "Tennis",
      "Volleyball", "Ludo", "Golf", "Formula 1", "Archery", "Wrestling",
      "Cycling", "Skating", "Bowling", "Darts", "Snooker", "Marathon",
      "Gymnastics", "Surfing", "Referee", "World Cup", "Olympics", "Trophy"
    ]
  },
  tech: {
    name: "Tech & Gadgets",
    words: [
      "iPhone", "WhatsApp", "Laptop", "ChatGPT", "Instagram", "Bluetooth",
      "YouTube", "Drone", "Smartwatch", "WiFi", "Google Maps", "Headphones",
      "Netflix", "Charger", "Alexa", "Tesla", "Keyboard", "Power Bank",
      "Spotify", "Printer", "VR Headset", "Telegram", "Robot", "Selfie Stick",
      "QR Code", "Password", "Screenshot", "AirPods", "Smart TV", "Cloud Storage"
    ]
  },
  household: {
    name: "Household Objects",
    words: [
      "Toothbrush", "Mirror", "Pillow", "Ceiling Fan", "Refrigerator",
      "Washing Machine", "Broom", "Bucket", "Pressure Cooker", "Remote Control",
      "Doormat", "Curtains", "Sofa", "Mixer Grinder", "Iron Box", "Clothesline",
      "Mosquito Coil", "Water Bottle", "Dustbin", "Toaster", "Microwave",
      "Blanket", "Wall Clock", "Doorbell", "Staircase", "Balcony", "Geyser",
      "Mop", "Cupboard", "Bedsheet"
    ]
  },
  lifestyle: {
    name: "Lifestyle",
    words: [
      "Gym", "Yoga", "Meditation", "Skincare Routine", "Dieting", "Thrifting",
      "Journaling", "Morning Walk", "Camping", "Road Trip", "Tattoo", "Piercing",
      "Manicure", "Spa Day", "Brunch", "Influencer", "Vlogging", "Protein Shake",
      "Cheat Day", "Detox", "Minimalism", "Budgeting", "Side Hustle",
      "Book Club", "Astrology", "Sneakers", "Perfume", "Sunglasses",
      "Fashion Show", "Bucket List"
    ]
  },
  places: {
    name: "Places",
    words: [
      "Taj Mahal", "Beach", "Airport", "Library", "Goa", "Eiffel Tower",
      "Hospital", "Cinema Hall", "Temple", "Railway Station", "Shopping Mall",
      "Himalayas", "Hostel", "Dubai", "Classroom", "Zoo", "Restaurant", "Japan",
      "Museum", "Waterfall", "Desert", "Amusement Park", "Barber Shop",
      "Petrol Pump", "Rooftop", "Metro Station", "Island", "Pyramid",
      "Great Wall", "Lighthouse"
    ]
  },
  nature: {
    name: "Nature & Weather",
    words: [
      "Rainbow", "Thunderstorm", "Snowfall", "Volcano", "Earthquake", "Tsunami",
      "Sunset", "Full Moon", "Solar Eclipse", "Forest", "River", "Ocean",
      "Mountain", "Cave", "Fog", "Heatwave", "Cyclone", "Sandstorm",
      "Autumn Leaves", "Coconut Tree", "Cactus", "Mushroom", "Coral Reef",
      "Glacier", "Lightning", "Monsoon", "Shooting Star", "Northern Lights",
      "Quicksand", "Whirlpool"
    ]
  },
  college: {
    name: "College Life",
    words: [
      "Attendance", "Exam Hall", "Canteen", "Assignment", "Group Project",
      "Backlog", "Internship", "Placement Drive", "Lab Record", "Viva",
      "Professor", "Bunking Class", "Class Notes", "Semester", "College Fest",
      "Farewell Party", "Convocation", "Roommate", "Mess Food", "Timetable",
      "Deadline", "Presentation", "Cheat Sheet", "Scholarship", "Alumni",
      "Freshers Party", "Study Group", "All-Nighter", "Report Card", "ID Card"
    ]
  },
  jobs: {
    name: "Jobs & Professions",
    words: [
      "Doctor", "Teacher", "Chef", "Pilot", "Police Officer", "Farmer",
      "Engineer", "Lawyer", "Barber", "Plumber", "Electrician", "Firefighter",
      "Nurse", "Journalist", "Photographer", "Astronaut", "Soldier", "Waiter",
      "Cashier", "Mechanic", "Dentist", "Architect", "Scientist", "Magician",
      "Stand-up Comedian", "Bus Driver", "Security Guard", "Delivery Agent",
      "Auto Driver", "Wedding Planner"
    ]
  },
  daily: {
    name: "Daily Life",
    words: [
      "Alarm Clock", "Traffic Jam", "Umbrella", "Auto Rickshaw", "Haircut",
      "Homework", "Power Cut", "Monday Morning", "Selfie", "Birthday Party",
      "Pocket Money", "Job Interview", "Wedding", "Long Queue", "Wallet",
      "Spectacles", "Bucket Bath", "Grocery Shopping", "Laundry Day",
      "Afternoon Nap", "Sneeze", "Hiccups", "Yawning", "Handshake", "Gossip",
      "Apology", "Surprise Gift", "Passport", "Train Ticket", "Missed Call"
    ]
  }
};

module.exports = { TOPICS };
