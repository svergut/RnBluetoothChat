import React from "react";
import { useContext } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Text, View, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { getChatMessages, saveMessageToStorage } from "../api/messageService";

import { CHAT_NEW_MESSAGE, REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE } from "../misc/constants";
import { ChatContext } from "../misc/contexts";
import { chatEventsEmitter } from "../misc/emitters";
import { bluetoothConnection } from "../models/bluetoothConnection";

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

    if (currentChat) {
        return (
            <View style={{height: '100%'}}>
                <View style={{height: '80%'}}>
                    <MessagesScrollView />
                </View>
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
            <TouchableOpacity onPress={() => {
                setInputText('')
                onSendPress(inputText, currentChat)
            }}>
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

    useEffect(async () => {
        if (!currentChat)
            return;

        const savedMessages = await getChatMessages(currentChat.id)
        
        setMessages([...savedMessages])
    }, [currentChat])    
    
    const onMessage = async (params) => {
        const { message } = params

        setMessages((messages) => [...messages, message])
    }
    
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
                    return <Message key={message.id} message={message} isIncoming={ currentChat.recieverMac !== message.recieverMac } /> 
                })
            }
        </ScrollView>
    )        
}

function Message(props) {
    const { message, isIncoming } = props
    const { createdAt: sentAt, text, senderMac: sender } = message

    const incomingColor = '#d0e8c8'
    const outcomingColor = '#c1dde6'

    const messageBackgroundColor = isIncoming ? incomingColor : outcomingColor

    const formattedDate = new Date(sentAt)

    return (
        <View style={{ flexDirection: 'row', marginVertical: 10 }}>
            { !isIncoming && <View style={{width: '60%'}}/>}
            <View style={{ backgroundColor: messageBackgroundColor, width: '40%', padding: 15 }}>
                <View style={{}}>                
                    <Text style={{fontSize: 10}}>{sender} at {formattedDate.getHours()}:{formattedDate.getMinutes()}</Text>
                </View>
                <Text style={{fontSize: 20}}>{text}</Text>            
            </View>
        </View>
        
    )
}