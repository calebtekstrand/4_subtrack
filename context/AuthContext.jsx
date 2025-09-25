'use client'

import { auth, db } from "@/firebase"
import { subscriptions } from "@/utils"
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { createContext, useContext, useEffect, useState } from "react"

const AuthContext = createContext()

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider(props) {
    const { children } = props

    const [currentUser, setCurrentUser] = useState(null)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(false)

    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        setCurrentUser(null)
        setUserData(null)
        return signOut(auth)
    }

    async function saveToFirebase(data) {
        try {
            const userRef = doc(db, 'users', currentUser.uid)
            const res = await setDoc(userRef, {
                subscriptions: data
            }, { merge: true })
        } catch (err) {
            console.log(err.message)
        }
    }

    async function handleAddSubscription(newSubscription) {
        // remove next line if I make this a PAID APP!!!
        if (userData.subscriptions.length > 30) { return }

        // modify global context
        const newSubscriptions = [...userData.subscriptions, newSubscription]
        setUserData({ subscriptions: newSubscriptions })

        // write changes to firebase db(async)
        await saveToFirebase(newSubscriptions)
    }

    async function handleDeleteSubscription(index) {
        //delete entry at that index
        const newSubscriptions = userData.subscriptions.filter((val, valIndex) => {
            return valIndex !== index
        })
        setUserData({ subscriptions: newSubscriptions })
        await saveToFirebase(newSubscriptions)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async user => {
            try {
                
                setCurrentUser(user)

                if (!user) { 
                    return 
                }
                setLoading(true)
                // user found! go to database!
                const docRef = doc(db, 'users', user.uid)
                const docSnap = await getDoc(docRef)
                console.log('Fetching user data')
                // let firebaseData = { subscriptions } // test data
                let firebaseData = { subscriptions: [] } // default data for new user
                if (docSnap.exists()) {
                    // data found
                    console.log('Found user data')
                    firebaseData = docSnap.data()
                }
                setUserData(firebaseData)
                setLoading(false)

            } catch (err) {
                console.log(err.message)
            }
        })
        return unsubscribe
    }, [])

    const value = {
        currentUser, userData, loading, signup, login, logout, handleAddSubscription, handleDeleteSubscription
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}