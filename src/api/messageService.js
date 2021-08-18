import AsyncStorage from "@react-native-community/async-storage"
import { CHATS_STORAGE_KEY, CHAT_STATUS_ACTIVE, MESSAGES_STORAGE_KEY } from "../misc/constants"

//chat is saved on op device
export async function createEmptyChat(recieverMac, recieverName) {
    const date = new Date()
    const chatId = JSON.stringify(date)

    const chat = {
        id: chatId,
        createdAt: date,        
        recieverMac: recieverMac,
        recieverName: recieverName,
        status: CHAT_STATUS_ACTIVE
    }

    await addChatToStorage(chat)

    return chat
}

export async function saveRecievedChat(chat) {    
    await addChatToStorage(chat)
}

export async function saveRecievedMessage(chatId, message) {
    await saveMessageToStorage(chatId, message)
}

export async function getChatById(id) {
    const chats = await getObjectFromStorage(CHATS_STORAGE_KEY)

    return chats[id]
}

export async function getChatMessages(chatId) {
    const messages = await getObjectFromStorage(MESSAGES_STORAGE_KEY) ?? {}

    return messages[chatId] ?? []
}

export async function getExistingChat(deviceAddress) {
    const chats = await getObjectFromStorage(CHATS_STORAGE_KEY) ?? {}
    const keys = Object.getOwnPropertyNames(chats)
    let existingChat
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const chat = chats[key]

        if (chat.recieverMac === deviceAddress) {
            existingChat = chat
            break
        }
    }

    if (existingChat)
        return existingChat
    else
        console.log('no chats with device ' + deviceAddress)
}

async function getObjectFromStorage(key) {
    const raw = await AsyncStorage.getItem(key)

    return JSON.parse(raw)
}

async function saveObjectToStorage(key, object) {
    await AsyncStorage.setItem(key, JSON.stringify(object))
}

async function addChatToStorage(chat) {
    let chats = await getObjectFromStorage(CHATS_STORAGE_KEY)

    if (!chats)
        chats = {}

    chats[chat.id] = chat

    await saveObjectToStorage(CHATS_STORAGE_KEY, chats)
}

export async function saveMessageToStorage(chatId, message) {
    let messages = await getObjectFromStorage(MESSAGES_STORAGE_KEY)

    if (!messages) 
        messages = {}
    

    let chatMessages = messages[chatId]

    if (!chatMessages)
        chatMessages = []

    chatMessages.push(message)

    messages[chatId] = chatMessages

    saveObjectToStorage(MESSAGES_STORAGE_KEY, messages)
}

export async function createMessage(text, chatId, senderMac, recieverMac) {    
    const date = new Date()
    const messageId = Math.random().toString()
    

    const message =  {
        chatId: chatId,
        id: messageId,
        text: text,        
        createdAt: date,
        senderMac: senderMac,
        recieverMac: recieverMac
    }

    return message
}

