# MongoDB collections used by this project (Motor async driver).
# No ORM schema definitions needed — documents are plain dicts.
#
# Collections:
#   users       — { email, username, hashed_password, created_at }
#   devices     — { device_name, user_id, created_at }
#   device_data — { device_id, payload, timestamp }
