import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Text, View, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { REQUEST_CREATE_CHAT } from "../misc/constants";
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

    const sendMessage = async (messageText) => {
        
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
    
    const { onSendPress } = props

    return (
        <View style={{flexDirection: 'row', position: 'absolute', left: 0, right: 0, justifyContent: 'center', alignItems: 'center', bottom: 40}}>
            <TextInput placeholder="Введите текст" style={{width: '80%', height: 50, borderColor: '#000', borderWidth: 1}} onChangeText={(value) => setInputText(value)} value={inputText}></TextInput>
            <View style={{width: 20}}/>
            <TouchableOpacity onPress={() => onSendPress(inputText)}>
                <View style={{backgroundColor: '#008c48', height: 50, padding: 8}}>
                    <Text style={{ color: '#fff' }}>Отправить</Text>    
                </View>
            </TouchableOpacity>           
        </View>
    )
}

function MessagesScrollView() {
    return (
        <ScrollView >
            
        </ScrollView>
    )
        
}