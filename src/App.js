import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, Pill, Phone, MessageCircle, Mic, Keyboard, CheckCircle } from 'lucide-react'; 
import { supabase } from './supabase';
import './App.css';
import { CHARACTER_PROMPTS } from './characterPrompts';




function App() {
  // --- 状態管理 ---
  const [activeTab, setActiveTab] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [safetyChecks, setSafetyChecks] = useState([]);
  const [medications, setMedications] = useState([
    { id: 1, name: '朝の薬', time: '08:00', taken: false },
    { id: 2, name: '昼の薬', time: '12:00', taken: false },
    { id: 3, name: '夜の薬', time: '20:00', taken: false }
  ]);
  const [contacts] = useState([
    { id: 1, name: '家族(太郎)', phone: '090-1234-5678', relation: '息子' },
    { id: 2, name: 'かかりつけ医', phone: '0123-45-6789', relation: '医師' },
    { id: 3, name: '緊急連絡先', phone: '119', relation: '救急' }
  ]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [claudeMessage, setClaudeMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
   // --- Supabase users ---
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
const [parentData, setParentData] = useState(null);
const [parentSafetyCheck, setParentSafetyCheck] = useState(null);
const [parentMedications, setParentMedications] = useState([]);
const [safetyCheckHistory, setSafetyCheckHistory] = useState([]);
const [medicationHistory, setMedicationHistory] = useState([]);
const [registrationStep, setRegistrationStep] = useState('select'); // 'select', 'main', 'support'
const [registrationName, setRegistrationName] = useState('');
const [inviteCode, setInviteCode] = useState('');
const [showPlanChange, setShowPlanChange] = useState(false);
const [showInviteHistory, setShowInviteHistory] = useState(false);
const [invitedUsers, setInvitedUsers] = useState([]);
const [selectedCharacter, setSelectedCharacter] = useState('woman30'); 
 
       // ✅ 今日の利用回数を取得
const getTodayUsageCount = async () => {
  if (!currentUser) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('id')
    .eq('user_id', currentUser.id)
    .gte('used_at', today.toISOString());

  if (error) {
    console.error('利用回数取得エラー:', error);
    return 0;
  }

  return data?.length || 0;
};

// ✅ 利用記録
const logUsage = async () => {
  if (!currentUser) return;

  const { error } = await supabase
    .from('usage_logs')
    .insert([{ user_id: currentUser.id }]);

  if (error) {
    console.error('利用記録エラー:', error);
  }
};

// ✅ 利用制限チェック
const checkUsageLimit = async () => {
  const count = await getTodayUsageCount();
  const limit = currentUser?.plan === 'free' ? 3 : 10;

  if (count >= limit) {
    alert(
      `本日の利用回数上限（${limit}回）に達しました。\n` +
      (currentUser?.plan === 'free'
        ? 'Basicプランにすると1日10回まで利用できます。'
        : '')
    );
    return false;
  }
  return true;
};




// ✅ 親ユーザー情報を取得
const fetchParentData = async (parentId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', parentId)
    .single();

  if (error) {
    console.error('親データ取得エラー:', error);
  } else {
    setParentData(data);
  }
};

// ✅ 親の最新体調を取得
const fetchParentSafetyCheck = async (parentId) => {
  const { data,error } = await supabase
    .from('safety_checks')
    .select('status, created_at')
    .eq('user_id', parentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('親の体調取得エラー:', error);
    setParentSafetyCheck(null);
  } else {
    setParentSafetyCheck(data);
  }
};
// ---------- ✅【ここに追加】最新の体調を取得 ----------
  const fetchLatestSafetyCheck = useCallback(async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('safety_checks')
      .select('status, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('最新体調取得エラー:', error);
    } else if (data) {
      setSafetyChecks([{
        id: 'latest',
        status: data.status,
        date: new Date(data.created_at).toLocaleString('ja-JP'),
      }]);
    }
  }, [currentUser]);
// ✅ 親の今日の服薬記録を取得
const fetchParentMedications = async (parentId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('user_id', parentId)
    .gte('taken_at', today.toISOString());

  if (error) {
    console.error('親の服薬データ取得エラー:', error);
    return [];
  } else {
    console.log('親の服薬データ:', data);
    return data || [];
  }
};
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*");

    if (error) {
      console.error("Supabase error:", error);
    } else {
      setUsers(data || []);
    }
  }, []);

  // ✅ 招待したユーザー一覧を取得
const fetchInvitedUsers = async () => {
  if (!currentUser || !currentUser.invite_code) {
    console.log('招待コードがありません');
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .select('name, created_at, role')
    .eq('invited_by', currentUser.invite_code)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('招待履歴取得エラー:', error);
    setInvitedUsers([]);
  } else {
    console.log('招待したユーザー:', data);
    setInvitedUsers(data || []);
  }
};
// ✅ プラン変更
const changePlan = async (newPlan) => {
  if (!currentUser) {
    alert('ユーザーが設定されていません');
    return;
  }

  const { error } = await supabase
    .from('users')
    .update({ plan: newPlan })
    .eq('id', currentUser.id);

  if (error) {
    console.error('プラン変更エラー:', error);
    alert('プラン変更に失敗しました: ' + error.message);
  } else {
    console.log('プラン変更成功:', newPlan);
    alert(`プランを${newPlan === 'free' ? '無料' : 'Basic'}プランに変更しました`);
    
    // currentUserを更新
    setCurrentUser({ ...currentUser, plan: newPlan });
    setShowPlanChange(false);
  }
};
// ✅ ログイン処理
const handleLogin = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('ログインエラー:', error);
    alert('ログインに失敗しました');
  } else {
    console.log('ログインユーザー:', data);
    setCurrentUser(data);
    setIsLoggedIn(true);
  }
};
// ✅ 招待コード生成（4桁）
const generateInviteCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// ✅ メイン使用者の登録
const registerMainUser = async () => {
  if (!registrationName.trim()) {
    alert('お名前を入力してください');
    return;
  }

  const code = generateInviteCode();

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name: registrationName,
        role: 'parent',
        plan: 'basic',
        invite_code: code
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('登録エラー:', error);
    alert('登録に失敗しました: ' + error.message);


  } else {
    console.log('登録成功:', data);
    alert(`登録完了！招待コード: ${code}\nこのコードを見守る方に伝えてください。`);
    setCurrentUser(data);
    setIsLoggedIn(true);
    setRegistrationStep('select');
    setRegistrationName('');
  }
};

// ✅ サポーターの登録
const registerSupportUser = async () => {
  if (!registrationName.trim()) {
    alert('お名前を入力してください');
    return;
  }

 if (!inviteCode.trim() || inviteCode.length !== 4) {
    alert('4桁の招待コードを入力してください');
    return;
  }

  // 招待コードで親を検索
  const { data: parentUser, error: searchError } = await supabase
    .from('users')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('role', 'parent')
    .single();

  if (searchError || !parentUser) {
    alert('招待コードが見つかりません。正しいコードを入力してください。');
    return;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        name: registrationName,
        role: 'child',
        plan: 'basic',
        linked_user_id: parentUser.id,
        invited_by: parentUser.invite_code
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('登録エラー:', error);
    alert('登録に失敗しました: ' + error.message);
  } else {
    console.log('登録成功:', data);
    alert(`登録完了！${parentUser.name}さんを見守ります。`);
    setCurrentUser(data);
    setIsLoggedIn(true);
    setRegistrationStep('select');
    setRegistrationName('');
    setInviteCode('');
  }
};
// ✅ ログアウト処理
const handleLogout = () => {
  setCurrentUser(null);
  setIsLoggedIn(false);
  setActiveTab('home');
  setSafetyCheckHistory([]);
  setMedicationHistory([]);
  setParentData(null);
  setParentSafetyCheck(null);
  setParentMedications([]);
};
const getParentSummary = () => {
  // ✅ DBから取得した親の体調と服薬を表示
  const totalMeds = 3; // 1日の服薬回数（朝・昼・夜）
  const takenMeds = parentMedications.length;
  
  return {
    condition: parentSafetyCheck ? parentSafetyCheck.status : '未記録',
    medication: `${takenMeds} / ${totalMeds} 回`
  };
};
// ✅ 体調を Supabase に保存
const saveSafetyCheckToDB = async (status) => {
  if (!currentUser) {
    console.error('ユーザーが設定されていません');
    return;
  }

 const { error } = await supabase
    .from('safety_checks')
    .insert([
      {
        user_id: currentUser.id,
        status: status
      }
    ]);

  if (error) {
    console.error('保存エラー:', error);
    alert('体調の保存に失敗しました: ' + error.message);
  } else {
    console.log('体調を保存しました:', status);
  }
};

 // ✅ 服薬記録を Supabase に保存
const saveMedicationToDB = async (medicationName) => {
  if (!currentUser) {
    console.error('ユーザーが設定されていません');
    return;
  }

 const { error } = await supabase
    .from('medication_logs')
    .insert([
      {
        user_id: currentUser.id,
        name: medicationName,
        taken_at: new Date().toISOString()
      }
    ]);

  if (error) {
    console.error('服薬記録の保存エラー:', error);
    alert('服薬記録の保存に失敗しました: ' + error.message);
  } else {
    console.log('服薬記録を保存しました:', medicationName);
  }
}; 

// ✅ 過去7日分の体調を取得
const fetchSafetyCheckHistory = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('safety_checks')
    .select('status, created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('履歴取得エラー:', error);
    return [];
  } else {
    console.log('取得した履歴:', data);
    return data || [];
  }
};

// ✅ 過去7日分の服薬を取得
const fetchMedicationHistory = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('medication_logs')
    .select('name, taken_at')
    .eq('user_id', userId)
    .gte('taken_at', sevenDaysAgo.toISOString())
    .order('taken_at', { ascending: false });

  if (error) {
    console.error('服薬履歴取得エラー:', error);
    return [];
  } else {
    console.log('取得した服薬履歴:', data);
    return data || [];
  }
};

  // 連続対話フラグ
  const [continueConversation, setContinueConversation] = useState(false); 

  // 音声認識インスタンスを useRef で保持 (無限ループ対策)
  const recognitionRef = useRef(null); 

  // --- 外部API関数（メモ化） ---

  // 天気情報取得
  const getWeather = useCallback(async () => {
    try {
      const response = await fetch('/.netlify/functions/weather'); 
      if (!response.ok) {
        throw new Error('天気情報の取得に失敗しました');
      }
      const data = await response.json();
      // デバッグ用にSaseboの天気情報を確認
      return data;
    } catch (error) {
      console.error('Weather Error:', error);
      return null;
    }
  }, []);

  // Claude API呼び出し
 // ✅ Claude + 音声生成（プラン別）
  const callClaudeWithVoice = useCallback(async (message) => {
    try {
      setIsLoading(true);
      
      const userPlan = currentUser?.plan || 'free';
      
      if (userPlan === 'free') {
        // 無料プラン: 既存のchat関数（テキストのみ）
        const response = await fetch('/.netlify/functions/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        
        if (!response.ok) throw new Error('API呼び出しに失敗しました');
        
        const data = await response.json();
        return { text: data.response, audio: null };
        
      } else {
        // 有料Basicプラン: paid-tts関数（テキスト + OpenAI音声）
        const response = await fetch('/.netlify/functions/paid-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message,
            character: selectedCharacter 
          })
        });
        
        if (!response.ok) throw new Error('API呼び出しに失敗しました');
        
        const data = await response.json();
        return { text: data.text, audio: data.audio }; // audio: base64文字列
      }
      
    } catch (error) {
      console.error('API Error:', error);
      alert('エラーが発生しました。もう一度お試しください。');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, selectedCharacter]);

  // --- 音声関連の関数（メモ化） ---

  // 音声読み上げ機能


  // ✅ 音声再生（プラン別）
  const speak = useCallback(async (text, audioBase64 = null, isContinuous = false) => {
    const userPlan = currentUser?.plan || 'free';

    if (userPlan === 'basic' && audioBase64) {
      // 有料Basic: OpenAI TTS音声を再生
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audio.onended = () => {
          setContinueConversation(isContinuous);
        };
        await audio.play();
      } catch (error) {
        console.error('音声再生エラー:', error);
      }
      
    } else {
      // 無料: ブラウザ音声
      if (!('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();

      const character = CHARACTER_PROMPTS[selectedCharacter];
      const voiceType = character.voiceType;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.volume = 1.0;

      switch (voiceType) {
        case 'child-high':
          utterance.rate = 1.15;
          utterance.pitch = 1.8;
          break;
        case 'female-soft':
          utterance.rate = 1.05;
          utterance.pitch = 1.4;
          break;
        case 'female-loud':
          utterance.rate = 1.1;
          utterance.pitch = 1.2;
          break;
        case 'male-energetic':
          utterance.rate = 1.15;
          utterance.pitch = 0.9;
          break;
        case 'male-calm':
          utterance.rate = 1.0;
          utterance.pitch = 0.8;
          break;
        default:
          utterance.rate = 1.05;
          utterance.pitch = 1.4;
      }

      const voices = window.speechSynthesis.getVoices();
      const jaVoices = voices.filter(v => v.lang === 'ja-JP');
      if (jaVoices.length > 0) {
        utterance.voice = jaVoices[0];
      }

      utterance.onend = () => {
        setContinueConversation(isContinuous);
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [selectedCharacter, currentUser]);
  
  // 音声認識開始
  const startListening = useCallback((isSilentRestart = false) => {
    const recognition = recognitionRef.current;
    if (recognition && !isListening) {
      setIsListening(true);
      
      // 手動開始時は挨拶を読み上げる
      if (!isSilentRestart) {
        speak('どうぞ、お話しください', false); 
      }
      
      // 認識をスタート
      setTimeout(() => {
        recognition.start();
      }, isSilentRestart ? 0 : 2000); 
    } else if (!recognition) {
      speak('申し訳ありません。お使いのブラウザは音声認識に対応していません', false);
    }
  }, [isListening, speak]);

  // 音声入力処理
  const handleVoiceInput = useCallback(async (transcript) => {
    speak('少々お待ちください', false); // 処理中は連続対話しない
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    
    const weather = await getWeather();
    
    const message = `今日は${dateStr}です。ユーザーからの質問:「${transcript}」

今日の佐世保市の天気情報:
- 天気:${weather ? weather.description : '情報なし'}
- 気温:${weather ? weather.temp + '度' : '情報なし'}

この質問に対して、180文字以内で自然な会話文で答えてください。
必ず最後に「他に何かお聞きになりたいことはありますか?」という一文で終わってください。

※重要:音声で読み上げられるので、以下に注意してください:
- 「一日」は「いちにち」と平仮名で書く
- 「今日」は「きょう」と平仮名で書く
- 読み間違えやすい漢字は平仮名にする
- 番号や記号は使わない

優しく寄り添う会話調でお願いします。`;
    
    const result = await callClaudeWithVoice(message);
    if (result) {
      setClaudeMessage(result.text);
      setShowMessage(true);
      await speak(result.text, result.audio, true);
    }
  }, [speak, getWeather, callClaudeWithVoice]);

  // --- 初期化とロジック ---

  // 時計の更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 音声認識の初期化とイベントハンドラの設定 (無限ループ対策)
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // recognitionRef.current が空の場合のみインスタンスを作成
    if (!recognitionRef.current) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = 'ja-JP';
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionRef.current = recognitionInstance;
    }
    
    const recognition = recognitionRef.current;
    
    // イベントハンドラを毎回設定し直す (useCallbackで定義された関数が最新の状態を参照するため)
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('認識された言葉:', transcript);
      setIsListening(false);
      setContinueConversation(false); // 認識が完了したらフラグを解除
      await handleVoiceInput(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error);
      setIsListening(false);
      setContinueConversation(false); // エラー時も解除
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        speak('すみません、聞き取れませんでした。もう一度お願いします。', true); // エラー後も対話継続
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
      // 読み上げ終了(speakのonend)によってセットされた continueConversation が true なら、認識を再開
      if (continueConversation) {
          console.log('--- 連続対話モード: 認識を再開 ---');
          startListening(true);
      } else {
          // 何も話さなかった場合や、手動で終了した場合は完全に停止
          console.log('--- 対話終了 ---');
      }
    };
    
    // Voiceのロードを待つ
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    // クリーンアップ関数
    return () => {
      // recognition.abort() を実行しないことで、途中で終わった会話を中断させずに済む
    };

  }, [handleVoiceInput, speak, continueConversation, startListening]); 
  
  // ✅ 初回データ取得
  // ✅ 初回データ取得
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ✅ ユーザーログイン後のデータ取得
 useEffect(() => {
    if (currentUser) {
      console.log('currentUserがセットされました:', currentUser);
      console.log('role:', currentUser.role);
      console.log('linked_user_id:', currentUser.linked_user_id);
      
      fetchLatestSafetyCheck();
      
      if (currentUser.role === 'child' && currentUser.linked_user_id) {
        console.log('親データを取得します。linked_user_id:', currentUser.linked_user_id);
        fetchParentData(currentUser.linked_user_id);
        fetchParentSafetyCheck(currentUser.linked_user_id);
        
        // ✅ 親の服薬データも取得
        fetchParentMedications(currentUser.linked_user_id).then(meds => {
          setParentMedications(meds);
        });
        
        // ✅ 子の場合は親の履歴を取得
        fetchSafetyCheckHistory(currentUser.linked_user_id).then(history => {
          setSafetyCheckHistory(history);
        });
        fetchMedicationHistory(currentUser.linked_user_id).then(history => {
          setMedicationHistory(history);
        });
     
      }
    }
  }, [currentUser, fetchLatestSafetyCheck]);
  
  // 挨拶メッセージ
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 10) return 'おはようございます';
    if (hour < 18) return 'こんにちは';
    return 'こんばんは';
  };
  
  // 今日のサマリー
  const getTodaysSummary = () => {
    const today = new Date().toLocaleDateString('ja-JP');
    const todayChecks = safetyChecks.filter(c => c.date.includes(today));
    const takenMeds = medications.filter(m => m.taken).length;
    return {
      safetyCheck: todayChecks.length > 0 ?
        todayChecks[0].status : '未記録',
      medications: `${takenMeds}/${medications.length}回`,
      lastCheck: todayChecks.length > 0 ?
        todayChecks[0].date : 'なし'
    };
  };

  // 文字入力の処理
  const handleTextInput = async () => {
    if (!textInput.trim()) return;
    
    const userQuestion = textInput;
    setTextInput('');
    setShowTextInput(false);
    
    speak('少々お待ちください', false);
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    
    const weather = await getWeather();
    const message = `今日は${dateStr}です。ユーザーからの質問:「${userQuestion}」

今日の佐世保市の天気情報:
- 天気:${weather ? weather.description : '情報なし'}
- 気温:${weather ? weather.temp + '度' : '情報なし'}

この質問に対して、200文字以内で自然な会話文で答えてください。
最後に「他に何かお聞きになりたいことはありますか?」と優しく問いかけてください。

※重要:音声で読み上げられるので、以下に注意してください:
- 「一日」は「いちにち」と平仮名で書く
- 「今日」は「きょう」と平仮名で書く
- 読み間違えやすい漢字は平仮名にする
- 番号や記号は使わない

優しく寄り添う会話調でお願いします。`;
   
  const result = await callClaudeWithVoice(message);
    
    if (result) {
      setClaudeMessage(result.text);
      setShowMessage(true);
      await speak(result.text, result.audio, true);
    }
  };


  // 体調チェック追加
   const addSafetyCheck = async (status) => {
    // ✅ 利用回数チェック
    const canUse = await checkUsageLimit();
    if (!canUse) return;

    // ✅ 利用記録
    await logUsage();

    // ✅ まずDBに保存
    await saveSafetyCheckToDB(status);
    
    // ✅ 保存後に最新データを取得して画面に反映
    await fetchLatestSafetyCheck();
    
    const check = {
      id: Date.now(),
      date: new Date().toLocaleString('ja-JP'),
      status: status,
      note: ''
    };
    setSafetyChecks([check, ...safetyChecks]);
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    
    let initialVoiceMessages = [];
    if (status === '良好') {
      initialVoiceMessages = ['体調が良好ですね。素晴らしいです。記録しました。少々お待ちください。'];
    } else if (status === '普通') {
      initialVoiceMessages = ['普通ですか。記録しました。無理せず、ゆっくり過ごしてくださいね。少々お待ちください。'];
    } else if (status === '注意') {
      initialVoiceMessages = ['体調が良くないようですね。心配です。記録しました。少々お待ちください。'];
    }
    
    
   const randomInitialMessage = initialVoiceMessages[Math.floor(Math.random() * initialVoiceMessages.length)];

// ✅ ブラウザ音声で即座に再生
if ('speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(randomInitialMessage);
  utterance.lang = 'ja-JP';
  utterance.rate = 1.05;
  utterance.pitch = 1.4;
  window.speechSynthesis.speak(utterance);
}

    
    const weather = await getWeather();
    const greeting = getGreeting();
    
    // ✅ キャラクタープロンプトを取得
    const characterPrompt = CHARACTER_PROMPTS[selectedCharacter];
    
    // ✅ キャラクターを考慮したメッセージ
   const claudeMessage = `
${characterPrompt}

${greeting}。今日の体調は「${status}」です。
天気は${weather ? weather.description : '情報なし'}、気温は${weather ? weather.temp + '度' : '情報なし'}です。

${status === '良好' ? '元気ですね。今日も良い一日になりますように。' : ''}
${status === '普通' ? '無理せず過ごしてくださいね。' : ''}
${status === '注意' ? '体調が良くないようですね。無理しないでください。' : ''}

100文字以内で自然な会話調で答えてください。
`;
    
   const result = await callClaudeWithVoice(claudeMessage);
    if (result) {
      setClaudeMessage(result.text);
      setShowMessage(true);
      await speak(result.text, result.audio, true);
    }
  };
  
  // 服薬記録

  const toggleMedication = async (id) => {
    const med = medications.find(m => m.id === id);
    if (!med || med.taken) return;
    
    // ✅ まずDBに保存
    await saveMedicationToDB(med.name);
    
    setMedications(medications.map(m => 
      m.id === id ? { ...m, taken: true } : m
    ));
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    
    const initialVoiceMessages = [`${med.name}を記録しました。えらいですね。少々お待ちください。`];
const randomMessage = initialVoiceMessages[Math.floor(Math.random() * initialVoiceMessages.length)];

// ✅ ブラウザ音声で即座に再生
if ('speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(randomMessage);
  utterance.lang = 'ja-JP';
  utterance.rate = 1.05;
  utterance.pitch = 1.4;
  window.speechSynthesis.speak(utterance);
}
    
    const weather = await getWeather();
    
    const message = `${med.name}を飲みました。天気は${weather ? weather.description : '情報なし'}です。100文字以内で褒めてください。`;
    const result = await callClaudeWithVoice(message);
    
    if (result) {
      setClaudeMessage(result.text);
      setShowMessage(true);
      await speak(result.text, result.audio, true);
    }
  };
  
  // 今日の情報取得
  const openClaudeChat = async () => {
  // ✅ ブラウザ音声で即座に再生
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('少々お待ちください。今日の情報を調べますね。');
    utterance.lang = 'ja-JP';
    utterance.rate = 1.05;
    utterance.pitch = 1.4;
    window.speechSynthesis.speak(utterance);
  }
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`;
    
    const weather = await getWeather();
    
    const greeting = getGreeting();
    const summary = getTodaysSummary();
    const message = `${greeting}。今日は${dateStr}です。体調:${summary.safetyCheck}、服薬:${summary.medications}。天気は${weather ? weather.description : '情報なし'}、${weather ? weather.temp + '度' : ''}です。150文字以内で今日の情報を話してください。`;
    const result = await callClaudeWithVoice(message);
    if (result) {
      setClaudeMessage(result.text);
      setShowMessage(true);
      await speak(result.text, result.audio, true);
    }
  };

  const summary = getTodaysSummary();
  
  // ✅ ログイン・登録画面
  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="container">
          <div className="header">
            <div className="header-content">
              <div className="header-left">
                <Heart className="heart-icon" size={40} />
                <div>
                  <h1>見守りアプリ</h1>
                  <p className="date">ようこそ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="content" style={{ paddingTop: '40px' }}>
            {/* 最初の選択画面 */}
            {registrationStep === 'select' && (
              <>
                <h2 className="section-title">はじめに</h2>
                <div className="button-grid" style={{ gap: '20px', marginBottom: '32px' }}>
                  <button
                    onClick={() => setRegistrationStep('main')}
                    className="status-button good"
                    style={{
                      padding: '24px',
                      fontSize: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontSize: '32px' }}>👤</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      メインで使用する人
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>
                      体調管理をする本人
                    </div>
                  </button>

                  <button
                    onClick={() => setRegistrationStep('support')}
                    className="status-button normal"
                    style={{
                      padding: '24px',
                      fontSize: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ fontSize: '32px' }}>👨‍👩‍👧</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      サポート・見守る人
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>
                      家族など
                    </div>
                  </button>
                </div>

                {users.length > 0 && (
                  <>
                    <h2 className="section-title" style={{ marginTop: '40px' }}>既存ユーザーでログイン</h2>
                    <div className="button-grid" style={{ gap: '12px' }}>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleLogin(user.id)}
                          className="status-button"
                          style={{
                            padding: '16px',
                            fontSize: '16px',
                            background: '#f8fafc',
                            color: '#1e293b'
                          }}
                        >
                          {user.name} ({user.role === 'parent' ? 'メイン' : 'サポート'})
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* メイン使用者の登録画面 */}
            {registrationStep === 'main' && (
              <div>
                <button
                  onClick={() => setRegistrationStep('select')}
                  style={{
                    padding: '8px 16px',
                    marginBottom: '16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ← 戻る
                </button>
                <h2 className="section-title">メイン使用者の登録</h2>
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>
                    お名前
                  </label>
                  <input
                    type="text"
                    value={registrationName}
                    onChange={(e) => setRegistrationName(e.target.value)}
                    placeholder="山田 太郎"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}
                  />
                  <button
                    onClick={registerMainUser}
                    className="status-button good"
                    style={{ width: '100%', padding: '16px', fontSize: '18px' }}
                  >
                    登録する
                  </button>
                  <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                    登録後、招待コードが発行されます。<br />
                    このコードを見守る方に伝えてください。
                  </p>
                </div>
              </div>
            )}

            {/* サポーターの登録画面 */}
            {registrationStep === 'support' && (
              <div>
                <button
                  onClick={() => setRegistrationStep('select')}
                  style={{
                    padding: '8px 16px',
                    marginBottom: '16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ← 戻る
                </button>
                <h2 className="section-title">サポーターの登録</h2>
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>
                    お名前
                  </label>
                  <input
                    type="text"
                    value={registrationName}
                    onChange={(e) => setRegistrationName(e.target.value)}
                    placeholder="山田 花子"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}
                  />
                  
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>
                    見守る方の招待コード（4桁）
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="1234"
                    maxLength="4"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '24px',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      fontWeight: 'bold'
                    }}
                  />
                  
                  <button
                    onClick={registerSupportUser}
                    className="status-button normal"
                    style={{ width: '100%', padding: '16px', fontSize: '18px' }}
                  >
                    登録する
                  </button>
                  <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
                    見守る方から招待コードを<br />
                    教えてもらってください。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="app">
      {showMessage && (
        <div className="message-overlay" onClick={() => setShowMessage(false)}>
          
          <div className="message-box" onClick={(e) => e.stopPropagation()}>
            <h3>Claudeからのメッセージ</h3>
            <p className="message-text">{claudeMessage}</p>
            <button className="close-button" onClick={() => setShowMessage(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
          {/* ✅ 招待履歴モーダル */}
    {showInviteHistory && (
      <div className="message-overlay" onClick={() => setShowInviteHistory(false)}>
        <div className="message-box" onClick={(e) => e.stopPropagation()}>
          <h3>招待履歴</h3>
          {invitedUsers.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {invitedUsers.map((user, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      background: '#f0fdf4',
                      color: '#16a34a',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    サポーター
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
              まだ誰も招待していません
            </p>
          )}
          <button className="close-button" onClick={() => setShowInviteHistory(false)}>
            閉じる
          </button>
        </div>
      </div>
    )}
    {/* ✅ プラン変更モーダル */}
{showPlanChange && (
  <div className="message-overlay" onClick={() => setShowPlanChange(false)}>
    <div className="message-box" onClick={(e) => e.stopPropagation()}>
      <h3>プラン変更</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          現在のプラン: <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
            {currentUser.plan === 'free' ? '無料プラン' : 'Basicプラン'}
          </span>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 無料プラン */}
        <button
          onClick={() => changePlan('free')}
          disabled={currentUser.plan === 'free'}
          style={{
            padding: '16px',
            background: currentUser.plan === 'free' ? '#e2e8f0' : '#f8fafc',
            border: currentUser.plan === 'free' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
            borderRadius: '8px',
            cursor: currentUser.plan === 'free' ? 'not-allowed' : 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
            無料プラン
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            • 1日3回まで利用可能<br />
            • 看護師風の話し方のみ<br />
            • ブラウザ音声
          </div>
        </button>

        {/* Basicプラン */}
        <button
          onClick={() => changePlan('basic')}
          disabled={currentUser.plan === 'basic'}
          style={{
            padding: '16px',
            background: currentUser.plan === 'basic' ? '#e2e8f0' : '#f8fafc',
            border: currentUser.plan === 'basic' ? '2px solid #3b82f6' : '2px solid #e2e8f0',
            borderRadius: '8px',
            cursor: currentUser.plan === 'basic' ? 'not-allowed' : 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
            Basicプラン
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            • 1日10回まで利用可能<br />
            • 5種類の話し方から選択<br />
            • 高品質OpenAI音声
          </div>
        </button>
      </div>

      <button 
        className="close-button" 
        onClick={() => setShowPlanChange(false)}
        style={{ marginTop: '16px' }}
      >
        閉じる
      </button>
    </div>
  </div>
)}
      <div className="container">
     {currentUser && (
    <div style={{ marginBottom: 16 }}>
      <div style={{ 
        fontSize: 14, 
        color: '#555',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <span>ログイン中：{currentUser.name}（{currentUser.role === 'parent' ? 'メイン' : 'サポート'}）</span>
        <button 
          onClick={handleLogout}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ログアウト
        </button>
      </div>
      
   {/* ✅ 招待コード表示（メインユーザーのみ） */}
{currentUser.role === 'parent' && currentUser.invite_code && (
  <div style={{
    background: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: '#1e40af',
    textAlign: 'center'
  }}>
    <span style={{ fontWeight: 'normal' }}>あなたの招待コードは </span>
    <span style={{ 
      fontSize: '24px', 
      fontWeight: 'bold',
      letterSpacing: '4px',
      margin: '0 8px'
    }}>
      {currentUser.invite_code}
    </span>
    <span style={{ fontWeight: 'normal' }}> です</span>
  </div>
)}

{/* ✅ 招待履歴表示ボタン（メインユーザーのみ） */}
{currentUser.role === 'parent' && (
  <div style={{ marginTop: '12px', textAlign: 'center' }}>
    <button
      onClick={() => {
        fetchInvitedUsers();
        setShowInviteHistory(true);
      }}
      style={{
        padding: '8px 16px',
        background: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      招待履歴を見る
    </button>
  </div>
  
)}
{/* ✅ プラン変更ボタン（メインユーザーのみ） */}
{currentUser.role === 'parent' && (
  <div style={{ marginTop: '12px', textAlign: 'center' }}>
    <button
      onClick={() => setShowPlanChange(true)}
      style={{
        padding: '8px 16px',
        background: '#f59e0b',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      プランを変更
    </button>
  </div>
)}
    </div>
  )}
        {/* ヘッダー部分 */}
        <div className="header">
          {/* 画像を表示するための構造。CSSが正しく適用されていれば表示されます。 */}
          <div className="header-main-layout">
            
            {/* 左側：挨拶、時刻、サマリー */}
            <div className="header-info-summary">
              <div className="header-content">
                <div className="header-left">
  <Heart className="heart-icon" size={40} />
  <div>
    <h1>見守りアプリ</h1>
    <p className="date">{currentTime.toLocaleDateString('ja-JP')}</p>
  </div>
  
 {/* ✅ child専用：親の今日の状況 */}
      {currentUser?.role === 'child' && parentData && (
        <div
          style={{
            background: '#f8fafc',
            border: '2px solid #6366f1',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24
          }}
        >
          <h3 style={{ marginBottom: 12 }}>
            親の今日の状況
          </h3>

          <p>👤 親の名前：{parentData.name}</p>
          <p>❤️ 体調：{getParentSummary().condition}</p>
          <p>💊 服薬：{getParentSummary().medication}</p>
        </div>
      )}
  {/* SOERU ロゴ追加部分 */}
  <img 
    src={process.env.PUBLIC_URL + "/soeruロゴ.jpg"} 
    alt="SOERU ロゴ"
    className="soeru-logo"
  />
</div>


                <div className="header-right">
                  <div className="time">
                    {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="summary">
                <p className="greeting">{getGreeting()}</p>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span>今日の体調:</span>
                    <span className="summary-value">{summary.safetyCheck}</span>
                  </div>
                  <div className="summary-item">
                    <span>服薬:</span>
                    <span className="summary-value">{summary.medications}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右側：介護士の画像とチェックマーク (画像ファイル名は public フォルダ内の名前に合わせてください) */}
            <div className="nurse-image-container">
              {/* 【重要】短いファイル名は使用せず、長いファイル名に手動で変更します */}
              <img 
                src={process.env.PUBLIC_URL + "/nurse.jpg"}
                alt="優しい笑顔の介護士" 
                className="nurse-image" 
              />
              {/* <img src="Gemini_Generated_Image_rrjagprrjagprrja.jpg" alt="優しい笑顔の介護士" className="nurse-image" /> */} 
              <div className="check-mark-overlay">
                {/* チェックマークの表示/非表示はCSSで行います */}
                <CheckCircle className="check-icon" size={40} />
              </div>
            </div>
            
          </div>
        </div>

        {isLoading && (
          <div className="loading-banner">
            <div className="loading-spinner"></div>
            <p>Claudeが情報を調べています...</p>
          </div>
        )}

        {/* 連続対話中であることを示すインジケータ */}
        {isListening && continueConversation && (
            <div className="listening-indicator">
              <Mic size={20} className="mic-icon-listening" />
              <p>対話継続中...お話しください</p>
            </div>
        )}

        <div className="claude-card">
          <div className="claude-header">
            <MessageCircle size={32} />
            <h2>Claudeとお話し</h2>
          </div>
          <p className="claude-text">マイクボタンを押して話しかけてください</p>
          <div className="claude-buttons">
            <button 
              onClick={() => startListening(false)} 
              className={`claude-button mic-button ${isListening ? 'listening' : ''}`}
              disabled={isLoading || isListening}
            >
              <Mic size={24} />
              <span>{isListening ? '聞いています...' : '話しかける'}</span>
            </button>
            <button 
              onClick={() => setShowTextInput(!showTextInput)} 
              className="claude-button text-button" 
              disabled={isLoading}
            >
              
              <Keyboard size={24} />
              <span>文字で質問</span>
            </button>
            <button 
              onClick={openClaudeChat} 
              className="claude-button info-button" 
              disabled={isLoading}
            >
              
              <MessageCircle size={24} />
              <span>今日の情報</span>
            </button>
          </div>
          
          {showTextInput && (
            <div className="text-input-area">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTextInput()}
                placeholder="質問を入力してください..."
                className="text-input"
                disabled={isLoading}
              />
              <button 
                onClick={handleTextInput}
                className="send-button"
                disabled={isLoading || !textInput.trim()}
              >
                送信
              </button>
            </div>
          )}
        </div>


        <div className="content">
          {activeTab === 'home' && (
    
         <div>
  {/* ✅ キャラ選択 */}
  <div className="section">
    <h3 className="subsection-title">話し方を選んでください</h3>

    {currentUser?.plan === 'free' ? (
      // 無料プラン：woman30のみ
      <div style={{ 
        background: '#f8fafc', 
        border: '2px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          {CHARACTER_PROMPTS.woman30.emoji}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {CHARACTER_PROMPTS.woman30.label}
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
          無料プラン：看護師風の話し方のみ（1日3回まで）
        </p>
      </div>
    ) : (
      // 有料Basicプラン：5種類選択可能
      <>
        <div className="button-grid">
          {Object.entries(CHARACTER_PROMPTS).map(([id, char]) => (
            <button
              key={id}
              onClick={() => setSelectedCharacter(id)}
              className={`character-button ${selectedCharacter === id ? 'active' : ''}`}
            >
              {char.emoji} {char.label}
            </button>
          ))}
        </div>
        <p className="hint">
          Basicプラン：5種類の話し方から選択可能（1日10回まで）
        </p>
      </>
    )}
  </div>

              <h2 className="section-title">かんたん記録</h2>
              
              <div className="section">
                <h3 className="subsection-title">
                  <Heart className="icon-red" size={24} />
          
                  今日の体調はどうですか?
                </h3>
                <div className="button-grid">
<button
  className="status-button good"
  disabled={isLoading}
  onClick={() => addSafetyCheck('良好')}
>
  良好
</button>

                

             <button
  className="status-button normal"
  disabled={isLoading}
  onClick={async () => {
    await saveSafetyCheckToDB('普通');
    addSafetyCheck('普通');
  }}
>
  普通
</button>
    
           <button
  className="status-button caution"
  disabled={isLoading}
  onClick={async () => {
    await saveSafetyCheckToDB('注意');
    addSafetyCheck('注意');
  }}
>
  注意
</button>
  
                </div>
                <p className="hint">ボタンを押すと自動で天気や今日の情報を話します</p>
              </div>

              <div className="section">
          
                <h3 className="subsection-title">
                  <Pill className="icon-blue" size={24} />
                  お薬を飲みましたか?
                </h3>
                <div className="med-list">
                  {medications.map(med => (
                    <button
                      key={med.id}
                      
                      onClick={() => toggleMedication(med.id)}
                      className={`med-item ${med.taken ? 'taken' : ''}`}
                      disabled={isLoading || med.taken}
                    >
                      <div className="med-left">
          
                        <div className={`checkbox ${med.taken ? 'checked' : ''}`}>
                          {med.taken && '✓'}
                        </div>
          
                        <div>
                          <h4>{med.name}</h4>
                          <p>{med.time}</p>
                        </div>
          
                      </div>
                      {med.taken && <span className="badge">済</span>}
                    </button>
                  ))}
                </div>
                <p className="hint">チェックすると自動で情報を話します</p>
          
              </div>
            </div>
          )}

        {activeTab === 'history' && (
            <div>
              <h2 className="section-title">
                {currentUser?.role === 'child' ? '親の記録履歴（過去7日間）' : '記録履歴（過去7日間）'}
              </h2>
              
              <h3 className="subsection-title">体調の記録</h3>
              <div className="history-list">
                {safetyCheckHistory.map((check, index) => (
                  <div key={index} className="history-item">
                    <span className={`status-badge ${check.status}`}>
                      {check.status}
                    </span>
                    <span className="date-small">
                      {new Date(check.created_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
                {safetyCheckHistory.length === 0 && (
                  <p className="empty">まだ記録がありません</p>
                )}
              </div>

              <h3 className="subsection-title" style={{ marginTop: '24px' }}>服薬の記録</h3>
              <div className="history-list">
                {medicationHistory.map((med, index) => (
                  <div key={index} className="history-item">
                    <span className="status-badge good">
                      {med.name}
                    </span>
                    <span className="date-small">
                      {new Date(med.taken_at).toLocaleString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
                {medicationHistory.length === 0 && (
                  <p className="empty">まだ記録がありません</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div>
          
              <h2 className="section-title">緊急連絡先</h2>
              <div className="contact-list">
                {contacts.map(contact => (
                  <a
                    key={contact.id}
                    href={`tel:${contact.phone}`}
          
                    className="contact-item"
                  >
                    <div>
                      <h3>{contact.name}</h3>
          
                      <p className="relation">{contact.relation}</p>
                      <p className="phone-number">{contact.phone}</p>
                    </div>
                    <Phone className="phone-icon" size={40} />
                  </a>
          
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-nav">
        <button
          onClick={() => setActiveTab('home')}
          className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
        >
          <Heart size={28} />
          <span>ホーム</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>履歴</span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`nav-button ${activeTab === 'contacts' ? 'active' : ''}`}
        >
          <Phone size={28} />
          <span>連絡先</span>
        </button>
      </div>
    </div>
  );
  
}

export default App;