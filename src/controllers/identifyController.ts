import { Request, Response } from 'express';
import { processIdentity } from '../services/contactService';

export const identify = async (req: Request, res: Response) => {
    try {
        const { email, phoneNumber } = req.body;

        if (!email && !phoneNumber) {
            return res.status(400).json({ error: 'Email or phoneNumber is required' });
        }

        const result = await processIdentity(
            email ? String(email) : undefined,
            phoneNumber ? String(phoneNumber) : undefined
        );

        return res.status(200).json({ contact: result });
    } catch (error) {
        console.error('Error processing identity:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
