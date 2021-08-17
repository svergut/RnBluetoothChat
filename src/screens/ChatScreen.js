import React from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Text, View, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { getChatMessages } from "../api/messageService";

import { REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE } from "../misc/constants";
import { ChatContext } from "../misc/contexts";
import { chatEventsEmitter } from "../misc/emitters";

export function ChatScreen({ navigation, route }) {
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

    return (
        <View style={{height: '100%'}}>
            <MessagesScrollView />
            <InputBar onSendPress={sendMessage}/>
        </View>
    )
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

function MessagesScrollView() {    
    const { currentChat } = useContext(ChatContext)
    const [ messages, setMessages ] = useState([])

    const onMessage = async (params) => {
        const { recieverAddress, chatId, text } = params

        messages.push(text) //replace with message object

        setMessages(Array.of(messages))
    }

    useEffect(async () => {
        if (!currentChat)
            return;

        const savedMessages = await getChatMessages(currentChat.id)

        setMessages(savedMessages)
    }, [currentChat])

    useEffect(async () => {
        chatEventsEmitter.on(REQUEST_CREATE_MESSAGE, onMessage)
    }, [])

    return (
        <ScrollView>
            {
                messages.map((message) => {
                    return <Text key={message}>{messages}</Text>
                })
            }
        </ScrollView>
    )        
}

function Message() {

}