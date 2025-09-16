const mongoose = require('mongoose');

const mentorshipChatboxSchema = new mongoose.Schema({
  mentorshipPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MentorshipPlan',
    required: true,
    unique: true // One chatbox per mentorship plan
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderType: {
      type: String,
      enum: ['mentor', 'student'],
      default: 'student'
    },
    content: {
      type: String,
      required: [true, 'Please provide message content'],
      trim: true,
      maxlength: [2000, 'Message content cannot be more than 2000 characters']
    },
    messageType: {
      type: String,
      enum: ['lesson', 'question', 'feedback', 'general', 'session'],
      default: 'general'
    },
    lessonData: {
      title: String,
      topic: String,
      difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced']
      },
      duration: Number, // minutes
      resources: [String] // links to materials
    },
    sessionData: {
      scheduledDate: Date,
      duration: Number, // minutes
      topic: String,
      notes: String,
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'rescheduled']
      }
    },
    attachments: [{
      type: {
        type: String,
        enum: ['image', 'file', 'video', 'link']
      },
      url: String,
      filename: String,
      size: Number
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscribers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: false
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    sessionCount: {
      type: Number,
      default: 0
    },
    maxSessions: {
      type: Number,
      default: 4 // per month
    }
  }],
  settings: {
    allowStudentMessages: {
      type: Boolean,
      default: true
    },
    autoArchiveAfterDays: {
      type: Number,
      default: 30
    },
    maxMessageLength: {
      type: Number,
      default: 2000
    },
    sessionBookingEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
mentorshipChatboxSchema.index({ mentorshipPlan: 1 });
mentorshipChatboxSchema.index({ 'subscribers.user': 1 });
mentorshipChatboxSchema.index({ 'messages.createdAt': -1 });

// Method to add subscriber
mentorshipChatboxSchema.methods.addSubscriber = function(userId, subscriptionId) {
  const existingSubscriber = this.subscribers.find(
    sub => sub.user.toString() === userId.toString()
  );
  
  if (existingSubscriber) {
    existingSubscriber.isActive = true;
    existingSubscriber.subscription = subscriptionId;
  } else {
    this.subscribers.push({
      user: userId,
      subscription: subscriptionId,
      isActive: true
    });
  }
  
  return this.save();
};

// Method to remove subscriber
mentorshipChatboxSchema.methods.removeSubscriber = function(userId) {
  const subscriber = this.subscribers.find(
    sub => sub.user.toString() === userId.toString()
  );
  
  if (subscriber) {
    subscriber.isActive = false;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to add message
mentorshipChatboxSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  return this.save();
};

// Method to schedule session
mentorshipChatboxSchema.methods.scheduleSession = function(userId, sessionData) {
  const subscriber = this.subscribers.find(
    sub => sub.user.toString() === userId.toString() && sub.isActive
  );
  
  if (!subscriber) {
    throw new Error('User is not an active subscriber');
  }
  
  if (subscriber.sessionCount >= subscriber.maxSessions) {
    throw new Error('Maximum sessions per month reached');
  }
  
  // Add session message
  this.messages.push({
    sender: userId,
    senderType: 'student',
    content: `Session scheduled for ${sessionData.scheduledDate}`,
    messageType: 'session',
    sessionData: {
      ...sessionData,
      status: 'scheduled'
    }
  });
  
  subscriber.sessionCount += 1;
  return this.save();
};

module.exports = mongoose.model('MentorshipChatbox', mentorshipChatboxSchema);
