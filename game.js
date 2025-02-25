class HexGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = {};
        this.hexSize = 60; // Base size - will be adjusted
        this.hexAspectRatio = 378/334; // height/width of hex image
        this.horizontalSpacing = this.hexSize * 1.19;
        this.verticalSpacing = (this.hexSize * this.hexAspectRatio) - 1.55;
        this.board = [];
        this.playerFuel = 12;
        this.computerFuel = 12;
        this.currentTurn = 'player';
        this.firstMove = true;
        this.imagesLoaded = false;
        
        // Hex grid constants
        this.SQRT3 = Math.sqrt(3);
        this.boardRadius = 4; // Creates a hex with 5 cells on each side
        
        // Offset for centering the board
        this.offsetX = 0;
        this.offsetY = 0;
        
        // Add player state
        this.player = {
            position: null,
            rotation: 30,  // degrees, initially facing northeast
            fuel: 12
        };
        
        this.computer = {
            position: null,
            rotation: 210, // degrees, initially facing southwest
            fuel: 12
        };
        
        // Add debug mode
        this.debugMode = false; // Set to true to show coordinates
        
        this.loadImages();
        this.initCanvas();
        this.setupRestartButton();
    }

    initCanvas() {
        const updateCanvasSize = () => {
            const maxSize = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.8);
            this.canvas.width = maxSize;
            this.canvas.height = maxSize;
            
            // Calculate hex size based on board radius and canvas size
            const gridWidth = (this.boardRadius * 2 + 1) * 1.9;
            this.hexSize = (maxSize / gridWidth) * 1.3;
            this.horizontalSpacing = this.hexSize * 1.29;
            this.verticalSpacing = (this.hexSize * this.hexAspectRatio) - 1.55;
            
            if (this.imagesLoaded) {
                this.drawGame();
            }
        };

        window.addEventListener('resize', updateCanvasSize);
        updateCanvasSize();
    }

    loadImages() {
        const imageNames = ['board', 'platform', 'player1', 'player2'];
        let loadedImages = 0;

        imageNames.forEach(name => {
            const img = new Image();
            img.src = `${name}.png`;
            img.onload = () => {
                loadedImages++;
                this.images[name] = img;
                if (loadedImages === imageNames.length) {
                    this.imagesLoaded = true;
                    this.initGame();
                }
            };
        });
    }

    initGame() {
        this.createBoard();
        this.placeInitialPieces();
        this.drawGame();
        this.setupEventListeners();
    }

    createBoard() {
        this.board = [];
        
        // Generate the hexagonal board shape
        for (let q = -this.boardRadius; q <= this.boardRadius; q++) {
            const r1 = Math.max(-this.boardRadius, -q - this.boardRadius);
            const r2 = Math.min(this.boardRadius, -q + this.boardRadius);
            
            for (let r = r1; r <= r2; r++) {
                const platformValue = Math.random() < 0.5 ? 
                    -(Math.floor(Math.random() * 5) + 5) : // -5 to -9
                    (Math.floor(Math.random() * 5) + 5);   // 5 to 9
                
                this.board.push({
                    q: q,
                    r: r,
                    s: -q-r, // Cubic coordinates: q + r + s = 0
                    value: platformValue,
                    occupied: false,
                    active: true
                });
            }
        }
    }

    placeInitialPieces() {
        // Find specific hexes for player and computer starting positions
        let playerHex = null;
        let computerHex = null;
        
        this.board.forEach(hex => {
            // Player starting position: q:-2, r:4, s:-2
            if (hex.q === -2 && hex.r === 4 && hex.s === -2) {
                playerHex = hex;
            }
            // Computer starting position: q:2, r:-4, s:2
            if (hex.q === 2 && hex.r === -4 && hex.s === 2) {
                computerHex = hex;
            }
        });

        // Set initial positions
        this.player.position = playerHex;
        this.computer.position = computerHex;
        
        // Mark hexes as occupied
        playerHex.occupied = 'player';
        computerHex.occupied = 'computer';
        
        // Remove first move restriction since players can now move in any direction
        this.firstMove = false;
        
        // Update fuel display
        this.updateFuelDisplay();
    }

    drawGame() {
        if (!this.imagesLoaded) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Center the board
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;

        // Draw background
        this.ctx.drawImage(this.images.board, 0, 0, this.canvas.width, this.canvas.height);

        // Draw platforms and debug info
        this.board.forEach(hex => {
            if (hex.active) {
                const point = this.hexToPixel(hex);
                
                this.ctx.save();
                this.ctx.translate(point.x, point.y);
                
                // Draw platform and value as before
                const platformWidth = this.hexSize * 1.2;
                const platformHeight = platformWidth * this.hexAspectRatio;
                this.ctx.drawImage(
                    this.images.platform,
                    -platformWidth/2,
                    -platformHeight/2,
                    platformWidth,
                    platformHeight
                );

                // Draw platform value
                this.ctx.fillStyle = 'white';
                this.ctx.font = `${this.hexSize/2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(hex.value.toString(), 0, 0);
                
                // Draw debug coordinates if debug mode is on
                if (this.debugMode) {
                    this.ctx.font = `${this.hexSize/4}px Arial`;
                    this.ctx.fillText(`q:${hex.q}`, 0, -this.hexSize/3);
                    this.ctx.fillText(`r:${hex.r}`, 0, 0);
                    this.ctx.fillText(`s:${hex.s}`, 0, this.hexSize/3);
                }
                
                this.ctx.restore();
            }
        });

        // Draw players
        if (this.player.position) {
            const playerPoint = this.hexToPixel(this.player.position);
            this.drawPlayer(playerPoint, this.player.rotation, 'player1');
        }
        
        if (this.computer.position) {
            const computerPoint = this.hexToPixel(this.computer.position);
            this.drawPlayer(computerPoint, this.computer.rotation, 'player2');
        }
    }

    drawPlayer(point, rotation, imageKey) {
        this.ctx.save();
        this.ctx.translate(point.x, point.y);
        this.ctx.rotate(rotation * Math.PI / 180);
        
        const playerWidth = this.hexSize * 1.2;
        const playerHeight = playerWidth * (this.images[imageKey].height / this.images[imageKey].width);
        
        this.ctx.drawImage(
            this.images[imageKey],
            -playerWidth/2,
            -playerHeight/2,
            playerWidth,
            playerHeight
        );
        
        this.ctx.restore();
    }

    hexToPixel(hex) {
        // Convert cube coordinates to pixel coordinates
        const x = this.horizontalSpacing * (hex.q + hex.r/2);
        const y = this.verticalSpacing * hex.r;
        return {
            x: x + this.offsetX,
            y: y + this.offsetY
        };
    }

    pixelToHex(x, y) {
        // Remove offset and adjust for hex spacing
        x = (x - this.offsetX) / this.horizontalSpacing;
        y = (y - this.offsetY) / this.verticalSpacing;
        
        // Convert pixel coordinates to axial coordinates
        const q = x - (y/2);
        const r = y;
        const s = -q - r;
        
        return this.roundHex({q, r, s});
    }

    roundHex(hex) {
        // Convert to cube coordinates and round
        let rq = Math.round(hex.q);
        let rr = Math.round(hex.r);
        let rs = Math.round(hex.s);

        // Get the difference between rounded and original
        const q_diff = Math.abs(rq - hex.q);
        const r_diff = Math.abs(rr - hex.r);
        const s_diff = Math.abs(rs - hex.s);

        // Adjust the coordinate with the largest difference
        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        } else {
            rs = -rq - rr;
        }

        return {q: rq, r: rr, s: rs};
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (this.currentTurn === 'player') {
                const hex = this.getClickedHex(e);
                if (this.isValidMove(hex)) {
                    this.makeMove(hex);
                }
            }
        });
    }

    getClickedHex(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hexCoords = this.pixelToHex(x, y);
        
        const clickedHex = this.board.find(hex => 
            hex.q === hexCoords.q && 
            hex.r === hexCoords.r && 
            hex.s === hexCoords.s
        );

        console.log('Clicked coordinates:', {
            pixel: {x, y},
            hex: hexCoords,
            foundHex: clickedHex
        });

        return clickedHex;
    }

    isValidMove(hex) {
        console.log('Checking move validity:', {
            targetHex: hex,
            currentTurn: this.currentTurn,
            playerPosition: this.player.position,
            playerFuel: this.player.fuel
        });

        // Check if destination hex exists and is available
        if (!hex || !hex.active || hex.occupied) {
            console.log('Invalid move: hex is null, inactive, or occupied', {
                hexNull: !hex,
                hexActive: hex?.active,
                hexOccupied: hex?.occupied
            });
            return false;
        }

        const player = this.currentTurn === 'player' ? this.player : this.computer;
        const start = player.position;
        
        // Calculate distance
        const distance = Math.max(
            Math.abs(hex.q - start.q),
            Math.abs(hex.r - start.r),
            Math.abs(hex.s - start.s)
        );

        console.log('Move distance:', distance);

        // Check fuel
        if (distance > player.fuel) {
            console.log('Invalid move: not enough fuel', {
                distance,
                fuel: player.fuel
            });
            return false;
        }

        // Check if it's a straight line (removed path checking)
        const deltaQ = hex.q - start.q;
        const deltaR = hex.r - start.r;
        const deltaS = hex.s - start.s;

        const scale = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(deltaS));
        
        console.log('Move vector:', {
            deltaQ,
            deltaR,
            deltaS,
            scale
        });

        if (scale === 0) {
            console.log('Invalid move: cannot move to current position');
            return false;
        }

        // Verify it's a straight line by checking if normalized deltas are integers
        const normalizedDeltaQ = deltaQ / scale;
        const normalizedDeltaR = deltaR / scale;
        const normalizedDeltaS = deltaS / scale;

        // Check if the move follows one of the six possible directions
        const isValidDirection = (
            (Math.abs(normalizedDeltaQ) === 1 && normalizedDeltaR === 0) || // horizontal
            (Math.abs(normalizedDeltaR) === 1 && normalizedDeltaQ === 0) || // vertical
            (Math.abs(normalizedDeltaQ) === 1 && Math.abs(normalizedDeltaR) === 1 && Math.sign(normalizedDeltaQ) === -Math.sign(normalizedDeltaR)) // diagonal
        );

        if (!isValidDirection) {
            console.log('Invalid move: not a straight line');
            return false;
        }

        console.log('Move is valid!');
        return true;
    }

    makeMove(hex) {
        const player = this.currentTurn === 'player' ? this.player : this.computer;
        const distance = Math.max(
            Math.abs(hex.q - player.position.q),
            Math.abs(hex.r - player.position.r),
            Math.abs(hex.s - player.position.s)
        );

        // Update fuel
        player.fuel -= distance;
        player.fuel += hex.value;

        // Store the platform we're leaving
        const oldHex = player.position;

        // Update positions
        oldHex.occupied = false;
        oldHex.active = false; // Remove the platform we're leaving
        player.position = hex;
        hex.occupied = this.currentTurn;

        // Update display
        this.updateFuelDisplay();
        this.drawGame();

        // Check for game over before switching turns
        if (this.isGameOver()) {
            this.handleGameOver();
            return;
        }

        // Switch turns
        this.currentTurn = this.currentTurn === 'player' ? 'computer' : 'player';

        // If it's computer's turn, make its move
        if (this.currentTurn === 'computer') {
            setTimeout(() => this.makeComputerMove(), 1000);
        }
    }

    updateFuelDisplay() {
        document.getElementById('playerFuel').textContent = this.player.fuel;
        document.getElementById('computerFuel').textContent = this.computer.fuel;
    }

    makeComputerMove() {
        const possibleMoves = this.getPossibleMoves('computer');
        
        if (possibleMoves.length === 0) {
            this.handleGameOver();
            return;
        }

        // Score each move
        const scoredMoves = possibleMoves.map(hex => ({
            hex,
            score: this.evaluateMove(hex)
        }));

        // Sort by score and pick the best move
        scoredMoves.sort((a, b) => b.score - a.score);
        console.log('Computer evaluated moves:', scoredMoves);
        
        // Make the best move
        this.makeMove(scoredMoves[0].hex);
    }

    getPossibleMoves(player) {
        const currentPosition = player === 'player' ? this.player.position : this.computer.position;
        const fuel = player === 'player' ? this.player.fuel : this.computer.fuel;
        
        // Get all active hexes within fuel range
        return this.board.filter(hex => {
            if (!hex.active || hex.occupied) return false;
            
            const distance = Math.max(
                Math.abs(hex.q - currentPosition.q),
                Math.abs(hex.r - currentPosition.r),
                Math.abs(hex.s - currentPosition.s)
            );
            
            // Check if we have enough fuel
            if (distance > fuel) return false;
            
            // Verify it's a valid straight-line move
            const deltaQ = hex.q - currentPosition.q;
            const deltaR = hex.r - currentPosition.r;
            const deltaS = hex.s - currentPosition.s;
            
            const scale = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(deltaS));
            if (scale === 0) return false;
            
            // Check if it's a valid direction
            const normalizedDeltaQ = deltaQ / scale;
            const normalizedDeltaR = deltaR / scale;
            const normalizedDeltaS = deltaS / scale;
            
            return (
                (Math.abs(normalizedDeltaQ) === 1 && normalizedDeltaR === 0) ||
                (Math.abs(normalizedDeltaR) === 1 && normalizedDeltaQ === 0) ||
                (Math.abs(normalizedDeltaQ) === 1 && Math.abs(normalizedDeltaR) === 1 && Math.sign(normalizedDeltaQ) === -Math.sign(normalizedDeltaR))
            );
        });
    }

    evaluateMove(hex) {
        const currentPosition = this.computer.position;
        
        // Calculate basic metrics
        const distance = Math.max(
            Math.abs(hex.q - currentPosition.q),
            Math.abs(hex.r - currentPosition.r),
            Math.abs(hex.s - currentPosition.s)
        );
        
        // Factors to consider:
        // 1. Platform value
        // 2. Fuel efficiency (value per distance moved)
        // 3. Position advantage (moving towards center/maintaining options)
        // 4. Distance from player (maybe avoid getting trapped)
        
        let score = 0;
        
        // Platform value (weighted heavily)
        score += hex.value * 2;
        
        // Fuel efficiency
        score += (hex.value / distance) * 10;
        
        // Position advantage (prefer central positions)
        const distanceFromCenter = Math.max(
            Math.abs(hex.q),
            Math.abs(hex.r),
            Math.abs(hex.s)
        );
        score -= distanceFromCenter * 0.5;
        
        // Count available moves after this one
        const futureFuel = this.computer.fuel - distance + hex.value;
        const futureOptions = this.board.filter(h => 
            h.active && !h.occupied && h !== hex &&
            Math.max(
                Math.abs(h.q - hex.q),
                Math.abs(h.r - hex.r),
                Math.abs(h.s - hex.s)
            ) <= futureFuel
        ).length;
        
        score += futureOptions * 0.3;
        
        return score;
    }

    isGameOver() {
        // Check if either player has no valid moves
        const playerMoves = this.getPossibleMoves('player');
        const computerMoves = this.getPossibleMoves('computer');

        return playerMoves.length === 0 || computerMoves.length === 0 || 
               this.board.filter(hex => hex.active).length <= 2;
    }

    handleGameOver() {
        let message;
        
        if (this.board.filter(hex => hex.active).length <= 2) {
            // Game ended with only two platforms remaining
            if (this.player.fuel > this.computer.fuel) {
                message = `Game Over! You win with ${this.player.fuel} fuel vs computer's ${this.computer.fuel}!`;
            } else if (this.computer.fuel > this.player.fuel) {
                message = `Game Over! Computer wins with ${this.computer.fuel} fuel vs your ${this.player.fuel}!`;
            } else {
                message = `Game Over! It's a draw! Both players have ${this.player.fuel} fuel.`;
            }
        } else {
            // Game ended because someone can't move
            const playerMoves = this.getPossibleMoves('player');
            const computerMoves = this.getPossibleMoves('computer');
            
            if (playerMoves.length === 0) {
                message = `Game Over! You have no valid moves left. Computer wins with ${this.computer.fuel} fuel!`;
            } else {
                message = `Game Over! Computer has no valid moves left. You win with ${this.player.fuel} fuel!`;
            }
        }

        alert(message);
        
        // Ask if they want to play again
        if (confirm('Would you like to play again?')) {
            this.restartGame();
        }
    }

    setupRestartButton() {
        document.getElementById('restartButton').addEventListener('click', () => {
            this.restartGame();
        });
    }

    restartGame() {
        // Reset game state
        this.board = [];
        this.currentTurn = 'player';
        this.firstMove = false;
        
        // Reset player states
        this.player = {
            position: null,
            rotation: 30,
            fuel: 12
        };
        
        this.computer = {
            position: null,
            rotation: 210,
            fuel: 12
        };
        
        // Reinitialize the game
        this.createBoard();
        this.placeInitialPieces();
        this.drawGame();
    }
}

// Start the game when the page loads
window.onload = () => {
    new HexGame();
}; 