import { auth } from '../config/firebase.js';

export const verifyFirebaseToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        if (!auth) {
            return res.status(500).json({ message: 'Internal Server Error: Firebase auth not initialized' });
        }

        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken; // Attach user info to request
        next();
    } catch (error) {
        console.error('Error verifying Firebase token:', error.message);
        return res.status(401).json({ message: 'Unauthorized: Invalid token', error: error.message });
    }
};
