import { REQUEST_CREATE_CHAT, REQUEST_CREATE_MESSAGE } from "../misc/constants";
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic'


export async function sendResponselessRequest() {
    
}

export async function sendRequest(reciever, request) {
    if (request.action === REQUEST_CREATE_MESSAGE) {
        
    }
    else if (request.action === REQUEST_CREATE_CHAT) {
        
    }
}