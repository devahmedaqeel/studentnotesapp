import { getDatabase } from '../database/database';
import { e2eeService } from './e2eeService';
import { chatService } from './chatService';
import { generateId } from '../utils/id';

export const connectSeedService = {
  /**
   * Seeds demo students, mutual connections, sample chats, and 24-hour statuses for testing.
   */
  async seedDemoData(myUserId: string = 'guest_user'): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // 1. Demo Student Profiles
    const demoStudents = [
      {
        id: 'demo_user_sara',
        username: 'sarakhan',
        publicStudentId: 'STU-9X42A1',
        displayName: 'Sara Khan',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        bio: 'Computer Science student • Passionate about AI & Mobile Dev',
        program: 'BS Computer Science',
        semester: '5th Semester',
        university: 'FAST University',
        onlineStatus: 'online',
        lastSeen: 'Just now',
        followersCount: 142,
        followingCount: 98,
      },
      {
        id: 'demo_user_hamza',
        username: 'hamza_ali',
        publicStudentId: 'STU-3B88K7',
        displayName: 'Hamza Ali',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        bio: 'Software Engineering • Building cool mobile apps',
        program: 'BS Software Engineering',
        semester: '4th Semester',
        university: 'NUST',
        onlineStatus: 'online',
        lastSeen: 'Just now',
        followersCount: 89,
        followingCount: 65,
      },
      {
        id: 'demo_user_ayesha',
        username: 'ayeshanoor',
        publicStudentId: 'STU-7K19M4',
        displayName: 'Ayesha Noor',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        bio: 'Electrical Engineering enthusiast ⚡',
        program: 'BSc Electrical Engineering',
        semester: '6th Semester',
        university: 'GIKI',
        onlineStatus: 'offline',
        lastSeen: '10m ago',
        followersCount: 210,
        followingCount: 180,
      },
      {
        id: 'demo_user_zain',
        username: 'zain_m',
        publicStudentId: 'STU-5F72P0',
        displayName: 'Zain Malik',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        bio: 'Data Science & Machine Learning 📊',
        program: 'BS Data Science',
        semester: '3rd Semester',
        university: 'ITU Lahore',
        onlineStatus: 'online',
        lastSeen: 'Just now',
        followersCount: 54,
        followingCount: 32,
      },
      {
        id: 'demo_user_bilal',
        username: 'bilal_ahmed',
        publicStudentId: 'STU-8R64L2',
        displayName: 'Bilal Ahmed',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        bio: 'Cyber Security & Cryptography researcher 🛡️',
        program: 'BS Cyber Security',
        semester: '7th Semester',
        university: 'LUMS',
        onlineStatus: 'offline',
        lastSeen: '1h ago',
        followersCount: 312,
        followingCount: 140,
      },
    ];

    for (const s of demoStudents) {
      await db.runAsync(
        `INSERT OR REPLACE INTO student_profiles (
          id, username, publicStudentId, displayName, avatarUrl, bio,
          program, semester, university, onlineStatus, lastSeen,
          followersCount, followingCount, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.username,
          s.publicStudentId,
          s.displayName,
          s.avatarUrl,
          s.bio,
          s.program,
          s.semester,
          s.university,
          s.onlineStatus,
          s.lastSeen,
          s.followersCount,
          s.followingCount,
          now - oneHour * 24 * 7,
          now,
        ]
      );
    }

    // Ensure my profile exists in student_profiles so foreign key in connections passes
    const myExisting = await db.getFirstAsync<any>(
      `SELECT id FROM student_profiles WHERE id = ?`,
      [myUserId]
    );
    if (!myExisting) {
      await db.runAsync(
        `INSERT OR REPLACE INTO student_profiles (
          id, username, publicStudentId, displayName, avatarUrl, bio,
          program, semester, university, onlineStatus, lastSeen,
          followersCount, followingCount, createdAt, updatedAt
        ) VALUES (?, 'my_profile', 'STU-100000', 'Me', null, null, null, null, null, 'online', 'Just now', 0, 0, ?, ?)`,
        [myUserId, now, now]
      );
    }

    // 2. Connections
    // (a) Sara Khan: Mutual Connection ('connected')
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'accepted', ?, ?)`,
      ['conn_sara_me', 'demo_user_sara', myUserId, now - oneHour * 48, now - oneHour * 48]
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'accepted', ?, ?)`,
      ['conn_me_sara', myUserId, 'demo_user_sara', now - oneHour * 48, now - oneHour * 48]
    );

    // (b) Hamza Ali: Mutual Connection ('connected')
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'accepted', ?, ?)`,
      ['conn_hamza_me', 'demo_user_hamza', myUserId, now - oneHour * 24, now - oneHour * 24]
    );
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'accepted', ?, ?)`,
      ['conn_me_hamza', myUserId, 'demo_user_hamza', now - oneHour * 24, now - oneHour * 24]
    );

    // (c) Ayesha Noor: Following
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'accepted', ?, ?)`,
      ['conn_me_ayesha', myUserId, 'demo_user_ayesha', now - oneHour * 12, now - oneHour * 12]
    );

    // (d) Zain Malik: Incoming Follow Request ('pending')
    await db.runAsync(
      `INSERT OR REPLACE INTO student_connections (id, requesterId, receiverId, status, createdAt, updatedAt)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      ['conn_zain_req', 'demo_user_zain', myUserId, now - oneHour * 2, now - oneHour * 2]
    );

    // 3. Demo E2EE Messages with Sara Khan
    const convSaraId = chatService.getConversationId(myUserId, 'demo_user_sara');
    const secretSaraKey = await e2eeService.deriveConversationKey(myUserId, 'demo_user_sara');

    const msg1Sara = 'Hey! Do you have the notes for Data Structures Lecture 4? 📚';
    const enc1 = await e2eeService.encryptText(msg1Sara, secretSaraKey);

    const msg2Sara = 'Yes, I have them! Sending you the PDF right now.';
    const enc2 = await e2eeService.encryptText(msg2Sara, secretSaraKey);

    const msg3Sara = 'Thanks a lot! Also check out the quiz deadline in the Student Diary ⏰';
    const enc3 = await e2eeService.encryptText(msg3Sara, secretSaraKey);

    // Upsert conversation FIRST
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_conversations (
        id, peerId, lastMessageId, lastMessagePreview, lastMessageTime, unreadCount, isMuted, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 1, 0, ?)`,
      [
        convSaraId,
        'demo_user_sara',
        'msg_demo_sara_3',
        msg3Sara.substring(0, 40),
        now - oneHour * 1,
        now - oneHour * 1,
      ]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, 'read', ?)`,
      ['msg_demo_sara_1', convSaraId, 'demo_user_sara', myUserId, enc1.ciphertext, enc1.iv, enc1.hmac, msg1Sara, now - oneHour * 3]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, 'read', ?)`,
      ['msg_demo_sara_2', convSaraId, myUserId, 'demo_user_sara', enc2.ciphertext, enc2.iv, enc2.hmac, msg2Sara, now - oneHour * 2]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, 'read', ?)`,
      ['msg_demo_sara_3', convSaraId, 'demo_user_sara', myUserId, enc3.ciphertext, enc3.iv, enc3.hmac, msg3Sara, now - oneHour * 1]
    );

    // 4. Demo E2EE Messages with Hamza Ali
    const convHamzaId = chatService.getConversationId(myUserId, 'demo_user_hamza');
    const secretHamzaKey = await e2eeService.deriveConversationKey(myUserId, 'demo_user_hamza');

    const msg1Hamza = 'Assalam o Alaikum! Are you coming to university tomorrow for the class? 🎓';
    const encHamza1 = await e2eeService.encryptText(msg1Hamza, secretHamzaKey);

    const msg2Hamza = 'Wa Alaikum Assalam! Yes, our first lecture is at 09:00 AM.';
    const encHamza2 = await e2eeService.encryptText(msg2Hamza, secretHamzaKey);

    // Upsert conversation FIRST
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_conversations (
        id, peerId, lastMessageId, lastMessagePreview, lastMessageTime, unreadCount, isMuted, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      [
        convHamzaId,
        'demo_user_hamza',
        'msg_demo_hamza_2',
        msg2Hamza.substring(0, 40),
        now - oneHour * 4,
        now - oneHour * 4,
      ]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, 'read', ?)`,
      ['msg_demo_hamza_1', convHamzaId, 'demo_user_hamza', myUserId, encHamza1.ciphertext, encHamza1.iv, encHamza1.hmac, msg1Hamza, now - oneHour * 5]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (
        id, conversationId, senderId, recipientId, messageType,
        ciphertext, iv, hmac, decryptedText, status, createdAt
      ) VALUES (?, ?, ?, ?, 'text', ?, ?, ?, ?, 'read', ?)`,
      ['msg_demo_hamza_2', convHamzaId, myUserId, 'demo_user_hamza', encHamza2.ciphertext, encHamza2.iv, encHamza2.hmac, msg2Hamza, now - oneHour * 4]
    );

    // 5. Demo 24-Hour Status Stories
    await db.runAsync(
      `INSERT OR REPLACE INTO student_statuses (
        id, userId, username, displayName, avatarUrl,
        statusType, content, bgColor, createdAt, expiresAt, viewersCount
      ) VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, 18)`,
      [
        'status_demo_sara_1',
        'demo_user_sara',
        'sarakhan',
        'Sara Khan',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        'Midterm exam schedule is out! 📚 Check timetable section.',
        '#8B5CF6',
        now - oneHour * 2,
        now + oneHour * 22,
      ]
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO student_statuses (
        id, userId, username, displayName, avatarUrl,
        statusType, content, bgColor, createdAt, expiresAt, viewersCount
      ) VALUES (?, ?, ?, ?, ?, 'text', ?, ?, ?, ?, 12)`,
      [
        'status_demo_hamza_1',
        'demo_user_hamza',
        'hamza_ali',
        'Hamza Ali',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'Anyone having Database Chapter 4 slides? 💻',
        '#0EA5E9',
        now - oneHour * 4,
        now + oneHour * 20,
      ]
    );
  },
};
