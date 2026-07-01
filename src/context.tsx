/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from "react";
import { UnityContext } from "react-unity-webgl";
import { useLocation } from "react-router";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { config } from "./config";
import {
  UserType,
  BettedUserType,
  GameHistory,
  ContextType,
  ContextDataType,
  MsgUserType,
  GameBetLimit,
  UserStatusType,
  GameStatusType,
  LoadingType,
  SeedDetailsType,
  unityContext as sharedUnityContext,
  init_state as sharedInitState,
  init_userInfo,
} from "./utils/interfaces";

export interface PlayerType {
  auto: boolean;
  betted: boolean;
  cashouted: boolean;
  betAmount: number;
  cashAmount: number;
  target: number;
}

const Context = React.createContext<ContextType>(null!);

const socket: Socket = io(process.env.REACT_APP_API_URL || "http://localhost:5000", {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  timeout: 20000,
  forceNew: false
});

let globalSimulationMode = true;
let onSimulatedEvent: (event: string, data: any) => void = () => {};

const originalEmit = socket.emit;
socket.emit = function (event: string, ...args: any[]) {
  if (globalSimulationMode) {
    onSimulatedEvent(event, args[0]);
    return socket;
  }
  return originalEmit.apply(socket, [event, ...args]);
} as any;

export const callCashOut = (at: number, index: "f" | "s") => {
  let data = { type: index, endTarget: at };
  socket.emit("cashOut", data);
};

let fIncreaseAmount = 0;
let fDecreaseAmount = 0;
let sIncreaseAmount = 0;
let sDecreaseAmount = 0;

let newState;
let newBetState;

export const Provider = ({ children }: any) => {
  const token = new URLSearchParams(useLocation().search).get("cert");
  const [state, setState] = React.useState<ContextDataType>(sharedInitState);
  const [userInfo, setUserInfo] = React.useState<UserType>(init_userInfo);
  const simNextCrashVal = React.useRef(2.0);
  const userInfoRef = React.useRef(userInfo);
  React.useEffect(() => {
    userInfoRef.current = userInfo;
  }, [userInfo]);
  const [msgData, setMsgData] = React.useState<MsgUserType[]>([]);
  const [msgTab, setMsgTab] = React.useState<boolean>(false);
  const [msgReceived, setMsgReceived] = React.useState<boolean>(false);
  const [platformLoading, setPlatformLoading] = React.useState<boolean>(false);
  const [errorBackend, setErrorBackend] = React.useState<boolean>(false);
  const [secure, setSecure] = React.useState<boolean>(false);
  const [userSeedText, setUserSeedText] = React.useState<string>("");
  const [globalUserInfo, setGlobalUserInfo] = React.useState<UserType>(init_userInfo);
  const [fLoading, setFLoading] = React.useState<boolean>(false);
  const [sLoading, setSLoading] = React.useState<boolean>(false);

  const [simulationMode, setSimulationMode] = React.useState<boolean>(true);
  const [adminCrashOverride, setAdminCrashOverrideState] = React.useState<number | null>(null);
  const setAdminCrashOverride = (val: React.SetStateAction<number | null>) => {
    setAdminCrashOverrideState((prev) => {
      const nextVal = typeof val === "function" ? (val as Function)(prev) : val;
      if (nextVal !== null) {
        fetch(`${config.api}/game/override-multiplier`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ multiplier: nextVal })
        }).catch(err => console.error("Error setting backend override:", err));
      }
      return nextVal;
    });
  };
  const [isOverridePersistent, setIsOverridePersistent] = React.useState<boolean>(false);

  React.useEffect(() => {
    globalSimulationMode = simulationMode;
  }, [simulationMode]);

  newState = state;
  const [unity, setUnity] = React.useState({
    unityState: false,
    unityLoading: false,
    currentProgress: 0,
  });
  const [gameState, setGameState] = React.useState({
    currentNum: "0",
    currentSecondNum: 0,
    GameState: "",
    time: 0,
    roundId: 1,
  });

  const [bettedUsers, setBettedUsers] = React.useState<BettedUserType[]>([]);
  const update = (attrs: Partial<ContextDataType>) => {
    setState((prev) => {
      const nextState = { ...prev, ...attrs };
      if (attrs.userInfo) {
        setUserInfo((prevUser) => {
          if (JSON.stringify(prevUser) === JSON.stringify(attrs.userInfo)) {
            return prevUser;
          }
          return attrs.userInfo as UserType;
        });
      }
      return nextState;
    });
  };

  // Keep state.userInfo synchronized with userInfo state
  React.useEffect(() => {
    setState(prev => {
      if (JSON.stringify(prev.userInfo) === JSON.stringify(userInfo)) {
        return prev;
      }
      return {
        ...prev,
        userInfo: userInfo
      };
    });
  }, [userInfo]);
  const [previousHand, setPreviousHand] = React.useState<UserType[]>([]);
  const [history, setHistory] = React.useState<number[]>([]);
  const [userBetState, setUserBetState] = React.useState<UserStatusType>({
    fbetState: false,
    fbetted: false,
    sbetState: false,
    sbetted: false,
  });
  newBetState = userBetState;
  const [rechargeState, setRechargeState] = React.useState(false);
  const [currentTarget, setCurrentTarget] = React.useState(0);
  const updateUserBetState = (attrs: Partial<UserStatusType>) => {
    setUserBetState({ ...userBetState, ...attrs });
  };

  const [betLimit, setBetLimit] = React.useState<GameBetLimit>({
    maxBet: 1000,
    minBet: 1,
  });
  React.useEffect(function () {
    // Unity loading event handlers
    sharedUnityContext.on("loaded", () => {
      console.log("✅ Unity WebGL loaded successfully");
      setUnity({
        currentProgress: 100,
        unityLoading: true,
        unityState: true,
      });
    });

    sharedUnityContext.on("error", (error) => {
      console.error("🔴 Unity WebGL error:", error);
      setUnity({
        currentProgress: 0,
        unityLoading: false,
        unityState: false,
      });
    });

    sharedUnityContext.on("GameController", function (message) {
      console.log("🎮 Unity message:", message);
      if (message === "Ready") {
        setUnity({
          currentProgress: 100,
          unityLoading: true,
          unityState: true,
        });
      }
    });

    sharedUnityContext.on("progress", (progression) => {
      const currentProgress = progression * 100;
      console.log(`📊 Unity loading progress: ${currentProgress.toFixed(1)}%`);
      if (progression === 1) {
        setUnity({ currentProgress, unityLoading: true, unityState: true });
      } else {
        setUnity({ currentProgress, unityLoading: false, unityState: false });
      }
    });

    return () => sharedUnityContext.removeAllEventListeners();
  }, []);

  React.useEffect(() => {
    // Socket connection event handlers
    socket.on("connect", () => {
      if (globalSimulationMode) return;
      console.log("✅ Connected to backend server");
      setErrorBackend(false);
      socket.emit("enterRoom", { token });
    });

    socket.on("disconnect", () => {
      if (globalSimulationMode) return;
      console.log("❌ Disconnected from backend server");
      setErrorBackend(true);
    });

    socket.on("connect_error", (error) => {
      if (globalSimulationMode) return;
      console.error("🔴 Connection error:", error);
      setErrorBackend(true);
    });

    socket.on("bettedUserInfo", (bettedUsers: BettedUserType[]) => {
      if (globalSimulationMode) return;
      setBettedUsers(bettedUsers);
    });

    socket.on("myBetState", (user: UserType) => {
      if (globalSimulationMode) return;
      const attrs = userBetState;
      attrs.fbetState = false;
      attrs.fbetted = user.f.betted;
      attrs.sbetState = false;
      attrs.sbetted = user.s.betted;
      setUserBetState(attrs);
    });

    socket.on("myInfo", (user: UserType) => {
      if (globalSimulationMode) return;
      let attrs = state;
      attrs.userInfo.balance = user.balance;
      attrs.userInfo.userType = user.userType;
      attrs.userInfo.userName = user.userName;
      update(attrs);
    });

    socket.on("history", (history: any) => {
      if (globalSimulationMode) return;
      setHistory(history);
    });

    socket.on("gameState", (gameState: GameStatusType) => {
      if (globalSimulationMode) return;
      setGameState(gameState);
    });

    socket.on("previousHand", (previousHand: UserType[]) => {
      if (globalSimulationMode) return;
      setPreviousHand(previousHand);
    });

    socket.on("finishGame", (user: UserType) => {
      if (globalSimulationMode) return;
      let attrs = newState;
      let fauto = attrs.userInfo.f.auto;
      let sauto = attrs.userInfo.s.auto;
      let fbetAmount = attrs.userInfo.f.betAmount;
      let sbetAmount = attrs.userInfo.s.betAmount;
      let betStatus = newBetState;
      attrs.userInfo = user;
      attrs.userInfo.f.betAmount = fbetAmount;
      attrs.userInfo.s.betAmount = sbetAmount;
      attrs.userInfo.f.auto = fauto;
      attrs.userInfo.s.auto = sauto;
      if (!user.f.betted) {
        betStatus.fbetted = false;
        if (attrs.userInfo.f.auto) {
          if (user.f.cashouted) {
            fIncreaseAmount += user.f.cashAmount;
            if (attrs.finState && attrs.fincrease - fIncreaseAmount <= 0) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
              fIncreaseAmount = 0;
            } else if (
              attrs.fsingle &&
              attrs.fsingleAmount <= user.f.cashAmount
            ) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
            } else {
              attrs.userInfo.f.auto = true;
              betStatus.fbetState = true;
            }
          } else {
            fDecreaseAmount += user.f.betAmount;
            if (attrs.fdeState && attrs.fdecrease - fDecreaseAmount <= 0) {
              attrs.userInfo.f.auto = false;
              betStatus.fbetState = false;
              fDecreaseAmount = 0;
            } else {
              attrs.userInfo.f.auto = true;
              betStatus.fbetState = true;
            }
          }
        }
      }
      if (!user.s.betted) {
        betStatus.sbetted = false;
        if (user.s.auto) {
          if (user.s.cashouted) {
            sIncreaseAmount += user.s.cashAmount;
            if (attrs.sinState && attrs.sincrease - sIncreaseAmount <= 0) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
              sIncreaseAmount = 0;
            } else if (
              attrs.ssingle &&
              attrs.ssingleAmount <= user.s.cashAmount
            ) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
            } else {
              attrs.userInfo.s.auto = true;
              betStatus.sbetState = true;
            }
          } else {
            sDecreaseAmount += user.s.betAmount;
            if (attrs.sdeState && attrs.sdecrease - sDecreaseAmount <= 0) {
              attrs.userInfo.s.auto = false;
              betStatus.sbetState = false;
              sDecreaseAmount = 0;
            } else {
              attrs.userInfo.s.auto = true;
              betStatus.sbetState = true;
            }
          }
        }
      }
      update(attrs);
      setUserBetState(betStatus);
    });

    socket.on("getBetLimits", (betAmounts: { max: number; min: number }) => {
      if (globalSimulationMode) return;
      setBetLimit({ maxBet: betAmounts.max, minBet: betAmounts.min });
    });

    socket.on("recharge", () => {
      if (globalSimulationMode) return;
      setRechargeState(true);
    });

    socket.on("error", (data) => {
      if (globalSimulationMode) return;
      setUserBetState({
        ...userBetState,
        [`${data.index}betted`]: false,
      });
      toast.error(data.message);
    });

    socket.on("success", (data) => {
      if (globalSimulationMode) return;
      toast.success(data);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("myBetState");
      socket.off("myInfo");
      socket.off("history");
      socket.off("gameState");
      socket.off("previousHand");
      socket.off("finishGame");
      socket.off("getBetLimits");
      socket.off("recharge");
      socket.off("error");
      socket.off("success");
    };
  }, [socket]);

  React.useEffect(() => {
    let attrs = state;
    let betStatus = userBetState;
    if (gameState.GameState === "BET") {
      if (betStatus.fbetState) {
        if (state.userInfo.f.auto) {
          if (state.fautoCound > 0) {
            update({ fautoCound: state.fautoCound - 1 });
          } else {
            setUserInfo(prev => ({
              ...prev,
              f: { ...prev.f, auto: false }
            }));
            betStatus.fbetState = false;
            return;
          }
        }
        let data = {
          betAmount: state.userInfo.f.betAmount,
          target: state.userInfo.f.target,
          type: "f",
          auto: state.userInfo.f.auto,
        };
        if (attrs.userInfo.balance - state.userInfo.f.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.fbetState = false;
          betStatus.fbetted = false;
          return;
        }
        attrs.userInfo.balance -= state.userInfo.f.betAmount;
        socket.emit("playBet", data);
        betStatus.fbetState = false;
        betStatus.fbetted = true;
        setUserBetState(betStatus);
      }
      if (betStatus.sbetState) {
        if (state.userInfo.s.auto) {
          if (state.sautoCound > 0) {
            update({ sautoCound: state.sautoCound - 1 });
          } else {
            setUserInfo(prev => ({
              ...prev,
              s: { ...prev.s, auto: false }
            }));
            betStatus.sbetState = false;
            return;
          }
        }
        let data = {
          betAmount: state.userInfo.s.betAmount,
          target: state.userInfo.s.target,
          type: "s",
          auto: state.userInfo.s.auto,
        };
        if (attrs.userInfo.balance - state.userInfo.s.betAmount < 0) {
          toast.error("Your balance is not enough");
          betStatus.sbetState = false;
          betStatus.sbetted = false;
          return;
        }
        attrs.userInfo.balance -= state.userInfo.s.betAmount;
        socket.emit("playBet", data);
        betStatus.sbetState = false;
        betStatus.sbetted = true;
        setUserBetState(betStatus);
      }
    }
  }, [gameState.GameState, userBetState.fbetState, userBetState.sbetState]);

  const getMyBets = async () => {
    try {
      const response = await fetch(`${config.api}/my-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: state.userInfo.userName }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status) {
          update({ myBets: data.data as GameHistory[] });
        }
      } else {
        console.error("Error:", response.statusText);
      }
    } catch (error) {
      console.log("getMyBets", error);
    }
  };

  useEffect(() => {
    if (gameState.GameState === "BET") getMyBets();
  }, [gameState.GameState]);

  const updateUserInfo = (attrs: Partial<UserType>) => {
    setUserInfo((prev) => {
      const updated = { ...prev, ...attrs };
      if (updated.token) {
        localStorage.setItem("aviator_user", JSON.stringify({
          username: updated.userName,
          balance: updated.balance,
          isAdmin: updated.userType
        }));
      }
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem("aviator_token");
    localStorage.removeItem("aviator_user");
    setUserInfo({
      ...init_userInfo,
      balance: 0,
      token: ""
    });
    toast.info("Logged out successfully.");
  };

  // Load user from localStorage on startup
  React.useEffect(() => {
    const token = localStorage.getItem("aviator_token");
    const userString = localStorage.getItem("aviator_user");
    if (token && userString) {
      try {
        const user = JSON.parse(userString);
        setUserInfo(prev => ({
          ...prev,
          token: token,
          userName: user.username,
          balance: user.balance,
          userType: user.isAdmin
        }));
      } catch (e) {
        console.error("Error parsing stored user details:", e);
      }
    }
  }, []);

  // Sync balance to MySQL server when it changes
  React.useEffect(() => {
    if (userInfo.token && userInfo.balance !== undefined) {
      const updateServerBalance = async () => {
        try {
          await fetch(`${config.api}/user/update-balance`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userInfo.token}`
            },
            body: JSON.stringify({ amount: userInfo.balance })
          });
        } catch (error) {
          console.error("Failed to sync balance with server:", error);
        }
      };
      updateServerBalance();
    }
  }, [userInfo.balance, userInfo.token]);
  const handleGetSeed = () => {/* implement or stub */};
  const handleGetSeedOfRound = async (id: number): Promise<SeedDetailsType> => {
    try {
      const response = await fetch(`${config.api}/game/seed/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userInfo.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error('Failed to fetch seed details');
      }
    } catch (error) {
      console.error('Error fetching seed details:', error);
      // Return default data structure to prevent errors
      return {
        createdAt: new Date().toISOString(),
        serverSeed: '',
        seedOfUsers: [],
        flyDetailID: id
      };
    }
  };
  const handlePlaceBet = () => {/* implement or stub */};
  const toggleMsgTab = () => setMsgTab((prev) => !prev);
  const handleChangeUserSeed = (seed: string) => {/* implement or stub */};

  // Handle socket emits intercepted during simulation mode
  React.useEffect(() => {
    onSimulatedEvent = (event: string, data: any) => {
      if (event === "playBet") {
        const { type, betAmount } = data;
        const currentUser = userInfoRef.current;
        if (currentUser.balance < betAmount) {
          toast.error("Your balance is not enough");
          return;
        }
        const nextBalance = currentUser.balance - betAmount;

        // Update database balance asynchronously
        fetch(`${config.api}/user/update-balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ amount: nextBalance })
        }).catch(err => console.error("Error updating db balance:", err));

        setUserInfo(prev => ({
          ...prev,
          balance: nextBalance,
          [type]: {
            ...prev[type as "f" | "s"],
            betted: true,
            betAmount
          }
        }));
        
        setUserBetState(prev => ({
          ...prev,
          [`${type}betted`]: true,
          [`${type}betState`]: false
        }));

        toast.success(`Bet placed on Hand ${type === "f" ? "1" : "2"}: ${betAmount} INR`);

      } else if (event === "cashOut") {
        const { type, endTarget } = data;
        const currentUser = userInfoRef.current;
        const userBet = currentUser[type as "f" | "s"];
        if (!userBet.betted) return;
        
        const winnings = parseFloat((userBet.betAmount * endTarget).toFixed(2));
        toast.success(`Cashed out at ${endTarget.toFixed(2)}x! Won ${winnings} INR`);
        const nextBalance = currentUser.balance + winnings;

        // Update database balance
        fetch(`${config.api}/user/update-balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({ amount: nextBalance })
        }).catch(err => console.error("Error updating db balance:", err));

        // Save winning bet to database
        fetch(`${config.api}/game/save-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: currentUser.userName,
            betAmount: userBet.betAmount,
            cashoutAt: endTarget,
            cashouted: true,
            flyAway: simNextCrashVal.current
          })
        }).then(() => {
          getMyBets();
        }).catch(err => console.error("Error saving winning bet:", err));

        setUserInfo(prev => ({
          ...prev,
          balance: nextBalance,
          [type]: {
            ...prev[type as "f" | "s"],
            betted: false,
            cashouted: true,
            cashAmount: winnings
          }
        }));

        setUserBetState(prev => ({
          ...prev,
          [`${type}betted`]: false,
          [`${type}betState`]: false
        }));
      }
    };
  }, []);

  // Game simulation & database synchronization loop
  React.useEffect(() => {
    if (!simulationMode) {
      setErrorBackend(false);
      return;
    }

    setErrorBackend(false);
    
    // Fetch round history from SQL on startup
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${config.api}/game/history`);
        if (response.ok) {
          const data = await response.json();
          if (data.status && data.data.length > 0) {
            setHistory(data.data.map((r: any) => r.multiplier));
          } else {
            setHistory([1.34, 2.56, 1.02, 4.12, 1.89, 12.45, 1.15, 3.20, 1.50, 8.44]);
          }
        } else {
          setHistory([1.34, 2.56, 1.02, 4.12, 1.89, 12.45, 1.15, 3.20, 1.50, 8.44]);
        }
      } catch (e) {
        setHistory([1.34, 2.56, 1.02, 4.12, 1.89, 12.45, 1.15, 3.20, 1.50, 8.44]);
      }
    };
    fetchHistory();

    setUserInfo(prev => ({
      ...prev,
      balance: prev.balance || 5000,
      userName: prev.userName || "Guest_Player",
      userType: true
    }));

    let syncInterval: any;

    const syncWithServer = async () => {
      try {
        const response = await fetch(`${config.api}/game/current-state`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.status) {
            const server = resData.data;
            const currentCrashVal = server.nextCrashVal;
            
            // Detect transition from PLAYING to GAMEEND (crash event)
            setGameState(prev => {
              const stateChanged = prev.GameState !== server.GameState;
              const timingDrifted = Math.abs(prev.time - server.time) > 800;
              
              if (stateChanged || timingDrifted) {
                // If it transitions to GAMEEND, handle user bet resolutions
                if (server.GameState === "GAMEEND" && prev.GameState === "PLAYING") {
                  const currentUser = userInfoRef.current;
                  const finalCrashMultiplier = currentCrashVal;
                  
                  // Save lost bets
                  if (currentUser.f.betted) {
                    fetch(`${config.api}/game/save-bet`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        username: currentUser.userName,
                        betAmount: currentUser.f.betAmount,
                        cashoutAt: null,
                        cashouted: false,
                        flyAway: finalCrashMultiplier
                      })
                    }).then(() => getMyBets()).catch(err => console.error("Error saving lost bet F:", err));
                  }

                  if (currentUser.s.betted) {
                    fetch(`${config.api}/game/save-bet`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        username: currentUser.userName,
                        betAmount: currentUser.s.betAmount,
                        cashoutAt: null,
                        cashouted: false,
                        flyAway: finalCrashMultiplier
                      })
                    }).then(() => getMyBets()).catch(err => console.error("Error saving lost bet S:", err));
                  }

                  // Reset player profile active bets
                  setUserInfo(p => ({
                    ...p,
                    f: { ...p.f, betted: false },
                    s: { ...p.s, betted: false }
                  }));

                  // Continue auto-bets for next round
                  setUserBetState(betStatePrev => {
                    const nextBetState = {
                      ...betStatePrev,
                      fbetted: false,
                      sbetted: false
                    };
                    if (currentUser.f.auto) {
                      nextBetState.fbetState = true;
                    }
                    if (currentUser.s.auto) {
                      nextBetState.sbetState = true;
                    }
                    return nextBetState;
                  });

                  // Re-fetch rounds history bar
                  fetchHistory();
                }

                return {
                  GameState: server.GameState,
                  currentNum: server.GameState === "BET" ? "0" : "1.00",
                  currentSecondNum: 0,
                  time: server.time,
                  roundId: server.roundId
                };
              }
              // Keep roundId in sync even if state/timing doesn't change
              if (prev.roundId !== server.roundId) {
                return { ...prev, roundId: server.roundId };
              }
              return prev;
            });

            simNextCrashVal.current = currentCrashVal;
            setBettedUsers(server.bots);
          }
        }
      } catch (e) {
        console.error("Error syncing with backend simulation:", e);
      }
    };

    // Run first sync and set interval
    syncWithServer();
    syncInterval = setInterval(syncWithServer, 1000); // Sync every second for tight alignment

    return () => {
      clearInterval(syncInterval);
    };
  }, [simulationMode]);

  // Local real-time multiplier ticker effect
  React.useEffect(() => {
    if (!simulationMode || gameState.GameState !== "PLAYING") return;

    const startTime = gameState.time;
    const ticker = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const multiplier = 1 + 0.06 * elapsed + Math.pow((0.06 * elapsed), 2) - Math.pow((0.04 * elapsed), 3) + Math.pow((0.04 * elapsed), 4);
      
      if (multiplier >= simNextCrashVal.current) {
        setCurrentTarget(simNextCrashVal.current);
        clearInterval(ticker);
      } else {
        setCurrentTarget(multiplier);
      }
    }, 30);

    return () => clearInterval(ticker);
  }, [simulationMode, gameState.GameState, gameState.time]);

  return (
    <Context.Provider
      value={{
        ...state,
        ...gameState,
        ...userBetState,
        ...betLimit,
        userInfo,
        state,
        socket,
        msgData,
        msgTab,
        msgReceived,
        setMsgReceived,
        platformLoading,
        errorBackend,
        unityState: unity.unityState,
        unityLoading: unity.unityLoading,
        currentProgress: unity.currentProgress,
        globalUserInfo,
        bettedUsers,
        previousHand,
        history,
        rechargeState,
        secure,
        myUnityContext: sharedUnityContext,
        userSeedText,
        currentTarget,
        fLoading,
        setFLoading,
        sLoading,
        setSLoading,
        setCurrentTarget,
        update: (attrs) => setState((prev) => ({ ...prev, ...attrs })),
        updateUserInfo,
        logout,
        getMyBets,
        updateUserBetState,
        setMsgData,
        handleGetSeed,
        handleGetSeedOfRound,
        handlePlaceBet,
        toggleMsgTab,
        handleChangeUserSeed,
        simulationMode,
        setSimulationMode,
        adminCrashOverride,
        setAdminCrashOverride,
        isOverridePersistent,
        setIsOverridePersistent,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export default Context;
