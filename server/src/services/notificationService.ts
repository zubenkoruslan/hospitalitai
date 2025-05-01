import Notification, {
  NotificationType,
  INotification,
} from "../models/Notification";
import mongoose from "mongoose";
import User, { IUser } from "../models/User";

/**
 * Service for handling notification-related operations
 */
class NotificationService {
  /**
   * Create a new assignment notification
   */
  async createAssignmentNotification(
    recipientId: mongoose.Types.ObjectId,
    quizId: mongoose.Types.ObjectId,
    quizName: string
  ) {
    const content = `You have been assigned a new quiz: ${quizName}`;
    return await Notification.create({
      recipient: recipientId,
      type: NotificationType.NEW_ASSIGNMENT,
      content,
      relatedId: quizId,
    });
  }

  /**
   * Create a notification for completed training
   */
  async createCompletedTrainingNotification(
    recipientId: mongoose.Types.ObjectId, // Manager who receives the notification
    staffId: mongoose.Types.ObjectId,
    staffName: string,
    quizId: mongoose.Types.ObjectId,
    quizName: string,
    resultId: mongoose.Types.ObjectId
  ) {
    const content = `${staffName} has completed the quiz: ${quizName}`;
    return await Notification.create({
      recipient: recipientId,
      type: NotificationType.COMPLETED_TRAINING,
      content,
      relatedId: resultId,
      metadata: {
        staffId: staffId.toString(),
        quizId: quizId.toString(),
        resultId: resultId.toString(),
      },
    });
  }

  /**
   * Create a notification for new staff registration
   */
  async createNewStaffNotification(
    recipientId: mongoose.Types.ObjectId, // Manager who receives the notification
    newStaffId: mongoose.Types.ObjectId,
    newStaffName: string
  ) {
    const content = `New staff member ${newStaffName} has registered`;
    return await Notification.create({
      recipient: recipientId,
      type: NotificationType.NEW_STAFF,
      content,
      relatedId: newStaffId,
      metadata: {
        staffId: newStaffId.toString(),
      },
    });
  }

  /**
   * Create a notification for new quiz creation
   */
  async createNewQuizNotification(
    recipientId: string,
    quizId: string,
    quizTitle: string
  ): Promise<INotification> {
    const notification = await Notification.create({
      type: NotificationType.NEW_QUIZ,
      recipient: new mongoose.Types.ObjectId(recipientId),
      content: `A new quiz "${quizTitle}" is available for you to take.`,
      relatedId: new mongoose.Types.ObjectId(quizId),
      isRead: false,
    });
    return notification;
  }

  /**
   * Notify all staff members about a new quiz
   */
  async notifyStaffAboutNewQuiz(
    restaurantId: string,
    quizId: string,
    quizTitle: string
  ): Promise<INotification[]> {
    // Find all staff members associated with this restaurant
    const staffMembers = await User.find({
      role: "staff",
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
    });

    // Create notifications for each staff member
    const notifications = await Promise.all(
      staffMembers.map((staff) => {
        if (!staff._id) {
          throw new Error("Staff member has no ID");
        }
        return this.createNewQuizNotification(
          staff._id.toString(),
          quizId,
          quizTitle
        );
      })
    );

    return notifications;
  }

  /**
   * Notify all restaurant managers about a new staff registration
   */
  async notifyManagersAboutNewStaff(
    restaurantId: mongoose.Types.ObjectId,
    newStaffId: mongoose.Types.ObjectId,
    newStaffName: string
  ) {
    // Find all managers of the restaurant
    const managers = await User.find({
      restaurantId,
      role: "manager",
    });

    // Create notifications for each manager
    const notifications = [];
    for (const manager of managers) {
      const notification = await this.createNewStaffNotification(
        manager._id as mongoose.Types.ObjectId,
        newStaffId,
        newStaffName
      );
      notifications.push(notification);
    }

    return notifications;
  }
}

export default new NotificationService();
