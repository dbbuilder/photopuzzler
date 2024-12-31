const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 800,
    backgroundColor: '#000000',
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Variables
let image;
let pieces = [];
let rows = 3;
let cols = 3;
let tileWidth, tileHeight;
let selectedPiece = null;
let timerText;
let timeLeft;
let timer;
let completed = false;

// Preload
function preload() {
    this.load.image('particle', 'https://labs.phaser.io/assets/particles/red.png'); // Firework particle
}

// Create
function create() {
    const input = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const levelSelect = document.getElementById('levelSelect');

    for (let i = 3; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} x ${i}`;
        levelSelect.appendChild(option);
    }

    levelSelect.addEventListener('change', (event) => {
        rows = parseInt(event.target.value);
        cols = rows;
        timeLeft = rows * cols * 10; // 10 seconds per piece
    });

    uploadButton.addEventListener('click', () => input.click());

    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const base64Image = e.target.result;
            loadUserImage.call(this, base64Image);
        };
        reader.readAsDataURL(file);
    });

    timerText = this.add.text(10, 10, `Time: 0:00`, { fontSize: '24px', fill: '#ffffff' });

    timer = this.time.addEvent({
        delay: 1000,
        callback: () => {
            if (!completed) {
                timeLeft--;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                timerText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
                if (timeLeft <= 0) {
                    alert('Time is up! Try again.');
                    location.reload();
                }
            }
        },
        loop: true
    });
}

// Load Image
function loadUserImage(base64Image) {
    this.textures.addBase64('userImage', base64Image);
    image = this.add.image(0, 0, 'userImage').setOrigin(0).setDisplaySize(800, 800);

    setTimeout(() => {
        splitImage.call(this);
    }, 200);
}

// Split Image
function splitImage() {
    tileWidth = image.displayWidth / cols;
    tileHeight = image.displayHeight / rows;

    pieces = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * tileWidth;
            const y = row * tileHeight;
            const textureKey = `piece_${row}_${col}`;

            this.textures.addCanvas(textureKey, getTileCanvas(image, x, y, tileWidth, tileHeight));
            let piece = this.add.image(x, y, textureKey)
                .setOrigin(0)
                .setInteractive();

            piece.originalPos = { row, col };
            piece.currentPos = { row, col };
            pieces.push(piece);
        }
    }

    shufflePieces();
    setupDragEvents.call(this);
}

// Tile Canvas
function getTileCanvas(image, x, y, width, height) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    context.drawImage(image.texture.getSourceImage(), x, y, width, height, 0, 0, width, height);
    return canvas;
}

// Shuffle
function shufflePieces() {
    const shuffledPositions = pieces.map(p => p.currentPos);
    Phaser.Utils.Array.Shuffle(shuffledPositions);

    pieces.forEach((piece, index) => {
        const pos = shuffledPositions[index];
        piece.currentPos = pos;
        piece.setPosition(pos.col * tileWidth, pos.row * tileHeight);
    });
}

// Drag Events
function setupDragEvents() {
    this.input.on('gameobjectdown', (pointer, gameObject) => {
        if (!selectedPiece) {
            selectedPiece = gameObject;
            selectedPiece.setAlpha(0.8);
        } else {
            const tempPos = selectedPiece.currentPos;
            selectedPiece.currentPos = gameObject.currentPos;
            gameObject.currentPos = tempPos;

            selectedPiece.setPosition(tempPos.col * tileWidth, tempPos.row * tileHeight);
            gameObject.setPosition(gameObject.currentPos.col * tileWidth, gameObject.currentPos.row * tileHeight);

            selectedPiece.setAlpha(1);
            selectedPiece = null;

            if (checkWinCondition()) {
                showFireworks.call(this);
            }
        }
    });
}

// Check Win
function checkWinCondition() {
    return pieces.every(piece => {
        return piece.currentPos.row === piece.originalPos.row && piece.currentPos.col === piece.originalPos.col;
    });
}

// Fireworks Animation
function showFireworks() {
    completed = true;
    for (let i = 0; i < 10; i++) {
        let particles = this.add.particles('particle');
        particles.createEmitter({
            x: Phaser.Math.Between(200, 600),
            y: Phaser.Math.Between(200, 600),
            speed: { min: 100, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            blendMode: 'ADD'
        });
    }
    this.time.delayedCall(3000, () => alert('Congratulations! You solved the puzzle!'));
}

function update() {}
