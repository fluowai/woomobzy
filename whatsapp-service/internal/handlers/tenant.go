package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func requireTenantID(c *gin.Context) (uuid.UUID, bool) {
	tenantIDStr := c.Query("tenant_id")
	if tenantIDStr == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "tenant_id is required"})
		return uuid.Nil, false
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant_id"})
		return uuid.Nil, false
	}

	return tenantID, true
}

func requireInstanceID(c *gin.Context) (uuid.UUID, bool) {
	instanceIDStr := c.Query("instance_id")
	if instanceIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "instance_id query parameter is required"})
		return uuid.Nil, false
	}

	instanceID, err := uuid.Parse(instanceIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance_id"})
		return uuid.Nil, false
	}

	return instanceID, true
}
