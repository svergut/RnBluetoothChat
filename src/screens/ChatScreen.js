import React from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Text, View, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { getChatMessages, saveMessageToStorage } from "../api/messageService";

import { CHAT_NEW_MESSAGE, REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE } from "../misc/constants";
import { ChatContext } from "../misc/contexts";
import { chatEventsEmitter } from "../misc/emitters";

export function ChatScreen({ navigation, route }) {
    const { currentChat } = useContext(ChatContext)

    const recieverMac = route.params?.recieverMac

    useEffect(() => {
        if (recieverMac) {
            chatEventsEmitter.emit(REQUEST_CREATE_CHAT, {recieverAddress: recieverMac})
        }
        else {
            return <Text>Произошла ошибка</Text>
        }
    }, [])

    const sendMessage = async (messageText, currentChat) => {
        if (!currentChat?.id)
            console.log('chat hasnt been created yet!')

        if (recieverMac) {
            chatEventsEmitter.emit(REQUEST_CREATE_MESSAGE, {recieverAddress: recieverMac, chatId: currentChat.id, text: messageText})
        }
    }

    console.log(currentChat)

    if (currentChat) {
        return (
            <View style={{height: '100%'}}>
                <MessagesScrollView />
                <InputBar onSendPress={sendMessage}/>
            </View>
        )
    }
    else {
        return <LoadingView />
    }

}

function InputBar(props) {
    const [inputText, setInputText] = useState('')
    const { currentChat } = useContext(ChatContext)
    
    const { onSendPress } = props

    return (
        <View style={{flexDirection: 'row', position: 'absolute', left: 0, right: 0, justifyContent: 'center', alignItems: 'center', bottom: 40}}>
            <TextInput placeholder="Введите текст" style={{width: '80%', height: 50, borderColor: '#000', borderWidth: 1}} onChangeText={(value) => setInputText(value)} value={inputText}></TextInput>
            <View style={{width: 20}}/>
            <TouchableOpacity onPress={() => onSendPress(inputText, currentChat)}>
                <View style={{backgroundColor: '#008c48', height: 50, padding: 8}}>
                    <Text style={{ color: '#fff' }}>Отправить</Text>    
                </View>
            </TouchableOpacity>           
        </View>
    )
}

function LoadingView() {
    return (
        <View style={{height: '100%', justifyContent: 'center', alignContent: 'center'}}>
            <Text style={{textAlign: 'center', fontSize: 30, textAlignVertical: 'center'}}>Идет загрузка...</Text>
        </View>
    )
}

function MessagesScrollView() {    
    const { currentChat } = useContext(ChatContext)
    const [ messages, setMessages ] = useState([])

    const onMessage = async (params) => {
        const { message } = params

        messages.push(message) //replace with message object

        setMessages(Array.of(...messages))

        saveMessageToStorage(message.chatId, message)
    }

    useEffect(async () => {
        if (!currentChat)
            return;

        const savedMessages = await getChatMessages(currentChat.id)

        console.log('savedMessages', savedMessages)

        setMessages(savedMessages)
    }, [currentChat])

    useEffect(async () => {
        chatEventsEmitter.on(CHAT_NEW_MESSAGE, onMessage)

        return () => {
            chatEventsEmitter.off(CHAT_NEW_MESSAGE, onMessage)
        }
    }, [])

    return (
        <ScrollView>
            {
                messages.map((message) => {
                    console.log(message)
                    console.log(Object.getOwnPropertyNames(message))
                    return <Text key={message['id']}>{message['text']}</Text>
                })
            }
        </ScrollView>
    )        
}

function Message(props) {
    const { incoming } = props

    const incomingColor = '#d0e8c8'
    const outcomingColor = '#c1dde6'


    return (
        <View style={{flexDirection: 'row', width: '50%'}}>
            
        </View>
    )
}