/**
 * Models Index
 * Configures relationships between models and exports them
 */

const Message = require('./message.model');
const Reply = require('./reply.model');

// Define relationships between models
Message.hasMany(Reply, {
    foreignKey: 'messageId',
    as: 'replies',
    onDelete: 'CASCADE'
});

Reply.belongsTo(Message, {
    foreignKey: 'messageId',
    as: 'message'
});

module.exports = {
    Message,
    Reply
};