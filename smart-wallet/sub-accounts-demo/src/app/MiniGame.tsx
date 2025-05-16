import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';


import { v4 } from 'uuid';
import { parseEther, toHex } from 'viem';
import { mnemonicToAccount, privateKeyToAddress } from 'viem/accounts';



import { useAccount, useConfig, useSendCalls, useSendTransaction } from 'wagmi';
import { getCallsStatus } from 'wagmi/actions';

const PLAYER_STEP = 10; // How many pixels the player moves per key press
const LASER_SPEED = 15; // How many pixels the laser moves per frame
const INITIAL_ENEMY_SPEED = 1.0; // Start slower
const ENEMY_SPEED_INCREMENT = 0.2; // How much to increase speed
const ENEMY_SPEED_INCREASE_INTERVAL_MS = 10000; // Increase speed every 10 seconds
const ENEMY_SPAWN_INTERVAL = 1000; // Decreased from 2000 to 1500 to increase spawn rate
const SHOOT_COOLDOWN_MS = 100; // Cooldown in milliseconds (4 shots per second)
const GAME_WIDTH = 400; // Width of the game area
const GAME_HEIGHT = 720; // Height of the game area

const PIXEL_SCALE = 4; // Each "pixel" in our art will be 4x4 canvas pixels

// 8-bit Player Ship Art (e.g., a simple 5x3 ship)
const PLAYER_PIXEL_ART = [
  [0, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
  [1, 0, 1, 0, 1],
];
const PLAYER_ART_WIDTH = PLAYER_PIXEL_ART[0].length; // 5 pixels wide
const PLAYER_ART_HEIGHT = PLAYER_PIXEL_ART.length; // 3 pixels high
const PLAYER_DRAW_WIDTH = PLAYER_ART_WIDTH * PIXEL_SCALE; // 20 canvas pixels wide
const PLAYER_DRAW_HEIGHT = PLAYER_ART_HEIGHT * PIXEL_SCALE; // 12 canvas pixels high

// 8-bit Enemy Ship Art (e.g., a simple 5x3 invader)
const ENEMY_PIXEL_ART = [
  [0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
];
const ENEMY_ART_WIDTH = ENEMY_PIXEL_ART[0].length; // 5 pixels wide
const ENEMY_ART_HEIGHT = ENEMY_PIXEL_ART.length; // 3 pixels high
const ENEMY_DRAW_WIDTH = ENEMY_ART_WIDTH * PIXEL_SCALE; // 20 canvas pixels wide
const ENEMY_DRAW_HEIGHT = ENEMY_ART_HEIGHT * PIXEL_SCALE; // 12 canvas pixels high

// Constants for drawing
const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 20;
const PLAYER_COLOR = 'green';
const LASER_WIDTH = 2;
const LASER_HEIGHT = 10;
const LASER_COLOR = 'red';
const ENEMY_DEFAULT_WIDTH = 20;
const ENEMY_DEFAULT_HEIGHT = 20;
const ENEMY_COLOR = 'blue';
const BACKGROUND_COLOR = '#000';

type Laser = {
  id: number;
  x: number;
  y: number;
};

// Added Enemy interface
type Enemy = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

// Style for Game Over Overlay
const baseOverlayStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
};

const finalScoreTextStyle = { margin: '16px 0' };
const controlElementStyle = { marginTop: '20px', width: '80%' }; // General style for button and input

// Styles for EventLog
const eventLogContainerStyle = {
  width: '280px', // Adjusted width
  height: `${GAME_HEIGHT}px`,
  backgroundColor: '#080808', // Slightly darker
  padding: '15px',
  borderLeft: '3px solid #00FFFF', // Cyan border
  overflowY: 'auto' as const,
  fontFamily: '"Press Start 2P", Consolas, "Courier New", monospace', // Arcade font, "Press Start 2P" is a common pixel font
  boxSizing: 'border-box' as const,
};

const eventLogHeaderStyle = {
  color: '#00FFFF', // Cyan
  marginBottom: '15px',
  fontSize: '1.4em', // Larger header
  textAlign: 'center' as const,
  textShadow: '0 0 5px #00FFFF, 0 0 10px #00FFFF', // Neon glow
};

const eventLogItemStyle = {
  color: '#39FF14', // Neon green
  marginBottom: '8px',
  fontSize: '0.85em', // Slightly smaller for density
  wordBreak: 'break-all' as const,
  lineHeight: '1.4',
  textShadow: '0 0 3px #39FF14', // Subtle glow
};

const noTransactionsMessageStyle = {
  color: '#777', // Muted color
  fontStyle: 'italic' as const,
  textAlign: 'center' as const,
  marginTop: '20px',
};



type MinigameProps = {
  onEnemyHit?: (enemyId: number) => void;
  onStartGame: () => void;
};

function MinigameContent({ onEnemyHit, onStartGame }: MinigameProps) {
  
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(GAME_WIDTH / 2);
  const [lasers, setLasers] = useState<Laser[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [canShoot, setCanShoot] = useState(true);
  const [currentEnemySpeed, setCurrentEnemySpeed] = useState(INITIAL_ENEMY_SPEED);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPositionRef = useRef(playerPosition);
  const canShootRef = useRef(canShoot);
  const currentEnemySpeedRef = useRef(currentEnemySpeed);
  const scoreRef = useRef(score);
  const isGameOverRef = useRef(isGameOver);
  const hasStartedRef = useRef(hasStarted);


  useEffect(
    function updatePlayerPosRef() {
      playerPositionRef.current = playerPosition;
    },
    [playerPosition],
  );
  useEffect(
    function updateCanShootStateRef() {
      canShootRef.current = canShoot;
    },
    [canShoot],
  );
  useEffect(
    function updateEnemySpeedRef() {
      currentEnemySpeedRef.current = currentEnemySpeed;
    },
    [currentEnemySpeed],
  );
  useEffect(
    function updateScoreRef() {
      scoreRef.current = score;
    },
    [score],
  );
  useEffect(
    function updateIsGameOverRef() {
      isGameOverRef.current = isGameOver;
    },
    [isGameOver],
  );
  useEffect(
    function updateHasStartedRef() {
      hasStartedRef.current = hasStarted;
    },
    [hasStarted],
  );

  const handleRecoveryInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRecoveryKeyInput(event.target.value);
    },
    [setRecoveryKeyInput],
  );

  const startGame = useCallback(() => {
    onStartGame();
    setPlayerPosition(GAME_WIDTH / 2);
    setLasers([]);
    setEnemies([]);
    setCanShoot(true);
    setCurrentEnemySpeed(INITIAL_ENEMY_SPEED);
    setScore(0);
    setIsGameOver(false);
    setHasStarted(true);
  }, [onStartGame]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!hasStartedRef.current || isGameOverRef.current) return;
      if (event.key === 'ArrowLeft') {
        setPlayerPosition((prev) => Math.max(0, prev - PLAYER_STEP));
      } else if (event.key === 'ArrowRight') {
        setPlayerPosition((prev) => Math.min(GAME_WIDTH - PLAYER_DRAW_WIDTH, prev + PLAYER_STEP));
      } else if (event.key === ' ' && canShootRef.current) {
        setLasers((prevLasers) => [
          ...prevLasers,
          {
            id: Date.now(),
            x: playerPositionRef.current,
            y: GAME_HEIGHT - PLAYER_DRAW_HEIGHT - 10,
          },
        ]);
        setCanShoot(false);
        setTimeout(() => setCanShoot(true), SHOOT_COOLDOWN_MS);
      }
    },
    [setPlayerPosition, setLasers, setCanShoot],
  );

  useEffect(
    function spawnEnemiesEffect() {
      if (!hasStarted || isGameOver) return;
      const intervalId = setInterval(() => {
        setEnemies((prevEnemies) => [
          ...prevEnemies,
          {
            id: Date.now(),
            x: Math.random() * (GAME_WIDTH - ENEMY_DRAW_WIDTH),
            y: 0,
            width: ENEMY_DRAW_WIDTH,
            height: ENEMY_DRAW_HEIGHT,
          },
        ]);
      }, ENEMY_SPAWN_INTERVAL);
      return () => clearInterval(intervalId);
    },
    [hasStarted, isGameOver],
  );

  useEffect(
    function increaseEnemySpeedOverTimeEffect() {
      if (!hasStarted || isGameOver) return;
      const intervalId = setInterval(() => {
        setCurrentEnemySpeed((prevSpeed) => prevSpeed + ENEMY_SPEED_INCREMENT);
      }, ENEMY_SPEED_INCREASE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    },
    [hasStarted, isGameOver],
  );

  useEffect(
    function gameAnimationLoop() {
      if (!hasStarted || isGameOver) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = BACKGROUND_COLOR;
          ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      let animationFrameId: number;

      const gameLoop = () => {
        if (!hasStartedRef.current || isGameOverRef.current) {
          cancelAnimationFrame(animationFrameId);
          return;
        }

        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        const currentLasers = lasers;
        const currentEnemies = enemies;

        const newLasers = currentLasers
          .map((laser) => ({ ...laser, y: laser.y - LASER_SPEED }))
          .filter((laser) => laser.y + LASER_HEIGHT > 0);

        const newEnemies = currentEnemies
          .map((enemy) => ({ ...enemy, y: enemy.y + currentEnemySpeedRef.current }))
          .filter((enemy) => enemy.y < GAME_HEIGHT + enemy.height);

        const hitEnemyIds = new Set<number>();
        const hitLaserIds = new Set<number>();
        let gameOverTriggered = false;

        const playerRect = {
          x: playerPositionRef.current,
          y: GAME_HEIGHT - PLAYER_DRAW_HEIGHT - 10,
          width: PLAYER_DRAW_WIDTH,
          height: PLAYER_DRAW_HEIGHT,
        };

        newEnemies.forEach((enemy) => {
          if (enemy.y + enemy.height >= GAME_HEIGHT) gameOverTriggered = true;
          if (
            playerRect.x < enemy.x + enemy.width &&
            playerRect.x + playerRect.width > enemy.x &&
            playerRect.y < enemy.y + enemy.height &&
            playerRect.y + playerRect.height > enemy.y
          )
            gameOverTriggered = true;
          newLasers.forEach((laser) => {
            if (
              laser.x < enemy.x + enemy.width &&
              laser.x + LASER_WIDTH > enemy.x &&
              laser.y < enemy.y + enemy.height &&
              laser.y + LASER_HEIGHT > enemy.y
            ) {
              hitEnemyIds.add(enemy.id);
              hitLaserIds.add(laser.id);
              setScore((prevScore) => prevScore + 10);
              if (onEnemyHit) {
                onEnemyHit(enemy.id);
              }
            }
          });
        });

        if (gameOverTriggered) {
          setIsGameOver(true);
        } else {
          const finalLasers = newLasers.filter((laser) => !hitLaserIds.has(laser.id));
          const finalEnemies = newEnemies.filter((enemy) => !hitEnemyIds.has(enemy.id));
          setLasers(finalLasers);
          setEnemies(finalEnemies);
        }

        // Player Drawing (uses pixel art)
        drawPixelArt(
          ctx,
          PLAYER_PIXEL_ART,
          playerPositionRef.current,
          GAME_HEIGHT - PLAYER_DRAW_HEIGHT - 10,
          PIXEL_SCALE,
          PLAYER_COLOR,
        );

        // Laser Drawing (reverted to fillRect for simple lines)
        ctx.fillStyle = LASER_COLOR;
        newLasers.forEach((laser) => {
          if (!hitLaserIds.has(laser.id)) {
            ctx.fillRect(
              laser.x + PLAYER_DRAW_WIDTH / 2 - LASER_WIDTH / 2, // Center laser on player
              laser.y,
              LASER_WIDTH,
              LASER_HEIGHT,
            );
          }
        });

        // Enemy Drawing (uses pixel art)
        newEnemies.forEach((enemy) => {
          if (!hitEnemyIds.has(enemy.id)) {
            drawPixelArt(ctx, ENEMY_PIXEL_ART, enemy.x, enemy.y, PIXEL_SCALE, ENEMY_COLOR);
          }
        });

        if (hasStartedRef.current && !isGameOverRef.current) {
          ctx.fillStyle = 'white';
          ctx.font = '20px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`Score: ${scoreRef.current}`, 10, 30);
        }

        if (hasStartedRef.current && !isGameOverRef.current) {
          animationFrameId = requestAnimationFrame(gameLoop);
        } else {
          cancelAnimationFrame(animationFrameId);
        }
      };
      animationFrameId = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(animationFrameId);
    },
    [hasStarted, isGameOver, lasers, enemies, onEnemyHit],
  );

  useEffect(
    function keyboardListenerSetup() {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    },
    [handleKeyDown],
  );

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        key="game-canvas"
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{ display: 'block', backgroundColor: BACKGROUND_COLOR }}
      />
      {!hasStarted && (
        <div style={baseOverlayStyle}>
          <h1>Mini Galaga</h1>
          <button
            onClick={startGame}
            style={controlElementStyle}
          >
            Start game
          </button>
        </div>
      )}
      {hasStarted && isGameOver && (
        <div style={baseOverlayStyle}>
          <h1>game over</h1>
          <p style={finalScoreTextStyle}>
            Final score: {score}
          </p>
          <button onClick={startGame} style={controlElementStyle}>
            Restart game
          </button>
        </div>
      )}
    </div>
  );
}

export function MiniGame() {
  
  const account = useAccount();
  
  const resetEnemyId = useCallback(() => {
    setEnemyIds([]);
  }, []);
  const [enemyIds, setEnemyIds] = useState<number[]>([]);
  const { sendTransactionAsync } = useSendTransaction()
  
  const handleEnemyHit = useCallback(
    async (enemyId: number, ) => {


      setEnemyIds((prev) => [enemyId, ...prev]);
    },
    [account?.address],
  );

  return (
    <div
      className="container"
      style={{
        position: 'relative',
        height: GAME_HEIGHT,
        justifyContent: 'center',
        display: 'flex',
        gap: '15px',
      }}
    >
      <MinigameContent onEnemyHit={handleEnemyHit} onStartGame={resetEnemyId} />
      <EventLog enemyIds={enemyIds} />
    </div>
  );
}
type EventLogProps = {
  enemyIds: number[];
};

function EventLog({ enemyIds }: EventLogProps) {
  return (
    <div style={eventLogContainerStyle}>
      <h2 style={eventLogHeaderStyle}>
        Transaction Log
      </h2>
      <div>
        {enemyIds.length === 0 ? (
          <p style={noTransactionsMessageStyle}>
            No transactions yet
          </p>
        ) : (
            
            enemyIds.map((enemyId: number) => <TransactionHash key={enemyId} enemyId={enemyId} />)
            
        )}
      </div>
    </div>
  );
}

type TransactionHashProps = {
  enemyId: number;
};

function TransactionHash({ enemyId }: TransactionHashProps) {
const { sendCallsAsync, data } = useSendCalls()
const [callsId, setCallsId] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const config = useConfig(); // Assuming useAccount gives access to wagmi config for getCallsStatus

  useEffect(() => { 
    async function getCallsId() {
      const {id} = await sendCallsAsync({calls: [{
        to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        value: parseEther('0'),
        }], capabilities: { 
            mode: {
                type: 'highThroughput',
                data: {
                   idempotencyKey: v4(),
                },
            },
            paymasterService: {
                url: `https://api.developer.coinbase.com/rpc/v1/base/Rd8EVaLBQ9hFOtp3Dz3R9ffnxCZQC2DC`, //For production use proxy
              }
        },
          
        })
          
          setCallsId(id);
    }
    getCallsId();

  }, [])

  useEffect(() => {
    if (!callsId) return;
    // Reset transactionHash if callsId changes
    setTransactionHash(null);

    const intervalId = setInterval(async () => {
      try {
        

        const status = await getCallsStatus(config, { id: callsId });
        
        // Assuming status has a structure like: { status: 'CONFIRMED', receipts: [{ transactionHash: '0x...' }] }
        // You might need to adjust this based on the actual return type of getCallsStatus
        if (status && status.status === 'success' && status.receipts && status.receipts.length > 0 && status.receipts[0].transactionHash) {
          setTransactionHash(status.receipts[0].transactionHash);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Error fetching call status:', error);
        // Optionally, clear interval on error or implement retry logic
      }
    }, 1000); // Poll every 2 seconds

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or callsId change
  }, [ config, callsId]);

  if (transactionHash) {
    return (
        <div>
      <a // Using a standard <a> tag for the link
        href={`https://base-sepolia.blockscout.com/tx/${transactionHash}`}
        target="_blank"
        rel="noopener noreferrer"
        style={eventLogItemStyle} // Apply the existing style
      >
        {transactionHash.substring(0, 6)}...{transactionHash.substring(transactionHash.length - 4)}
      </a>
      </div>
    );
  }

  return (
    <div>
    <p style={eventLogItemStyle}>
      processing..
    </p>
    </div>
  );
}

// Helper function to draw pixel art
function drawPixelArt(
  ctx: CanvasRenderingContext2D,
  art: number[][],
  startX: number,
  startY: number,
  scale: number,
  color: string,
) {
  ctx.fillStyle = color;
  art.forEach((row, y) => {
    row.forEach((pixel, x) => {
      if (pixel) {
        // If pixel is 1 (or truthy), draw it
        ctx.fillRect(startX + x * scale, startY + y * scale, scale, scale);
      }
    });
  });
}
