import { Contact } from '@prisma/client';
import prisma from '../prisma/client';

export const processIdentity = async (email?: string, phoneNumber?: string) => {
    const matchingContacts = await prisma.contact.findMany({
        where: {
            OR: [
                ...(email ? [{ email }] : []),
                ...(phoneNumber ? [{ phoneNumber }] : [])
            ]
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    if (matchingContacts.length === 0) {
        const newContact = await prisma.contact.create({
            data: {
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: 'primary'
            }
        });

        return formatResponse(newContact, []);
    }

    const primaryIds = new Set<number>();
    for (const contact of matchingContacts) {
        if (contact.linkPrecedence === 'primary') {
            primaryIds.add(contact.id);
        } else if (contact.linkedId) {
            primaryIds.add(contact.linkedId);
        }
    }

    const allRelatedContacts = await prisma.contact.findMany({
        where: {
            OR: [
                { id: { in: Array.from(primaryIds) } },
                { linkedId: { in: Array.from(primaryIds) } }
            ]
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const primaryContact = allRelatedContacts[0];
    let secondaryContacts = allRelatedContacts.slice(1);

    let currentPrimary = primaryContact;
    const otherPrimaries = secondaryContacts.filter(c => c.linkPrecedence === 'primary');

    if (otherPrimaries.length > 0) {
        const primaryContactIdsToUpdate = otherPrimaries.map(c => c.id);

        await prisma.contact.updateMany({
            where: {
                OR: [
                    { id: { in: primaryContactIdsToUpdate } },
                    { linkedId: { in: primaryContactIdsToUpdate } }
                ]
            },
            data: {
                linkPrecedence: 'secondary',
                linkedId: currentPrimary.id
            }
        });

        secondaryContacts = secondaryContacts.map(c => {
            if (c.linkPrecedence === 'primary') {
                return { ...c, linkPrecedence: 'secondary', linkedId: currentPrimary.id, updatedAt: new Date() };
            }
            if (c.linkedId && primaryContactIdsToUpdate.includes(c.linkedId)) {
                return { ...c, linkedId: currentPrimary.id, updatedAt: new Date() };
            }
            return c;
        });
    }

    const hasExactEmail = email ? allRelatedContacts.some(c => c.email === email) : true;
    const hasExactPhone = phoneNumber ? allRelatedContacts.some(c => c.phoneNumber === phoneNumber) : true;

    if (!hasExactEmail || !hasExactPhone) {
        const newContact = await prisma.contact.create({
            data: {
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkedId: currentPrimary.id,
                linkPrecedence: 'secondary'
            }
        });
        secondaryContacts.push(newContact);
    }

    return formatResponse(currentPrimary, secondaryContacts);
};

const formatResponse = (primaryContact: Contact, secondaryContacts: Contact[]) => {
    const emails = new Set<string>();
    if (primaryContact.email) emails.add(primaryContact.email);

    const phoneNumbers = new Set<string>();
    if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

    const secondaryContactIds: number[] = [];

    for (const contact of secondaryContacts) {
        if (contact.email) emails.add(contact.email);
        if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
        if (contact.linkPrecedence === 'secondary' || contact.id !== primaryContact.id) {
            secondaryContactIds.push(contact.id);
        }
    }

    return {
        primaryContatctId: primaryContact.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds
    };
};
