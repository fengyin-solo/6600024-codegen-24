package com.opcua.model;

import java.time.Instant;

/**
 * OPC-UA 数据值模型
 * 包含值、质量码和时间戳信息
 */
public class DataValueModel {

    private String nodeId;
    private Object value;
    private String quality;         // Good, Bad, Uncertain
    private Instant timestamp;
    private Instant sourceTimestamp;
    private Instant serverTimestamp;
    private int statusCode;

    public DataValueModel() {
    }

    public DataValueModel(String nodeId, Object value, String quality, Instant timestamp) {
        this.nodeId = nodeId;
        this.value = value;
        this.quality = quality;
        this.timestamp = timestamp;
    }

    // Getters and Setters

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public String getQuality() {
        return quality;
    }

    public void setQuality(String quality) {
        this.quality = quality;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public Instant getSourceTimestamp() {
        return sourceTimestamp;
    }

    public void setSourceTimestamp(Instant sourceTimestamp) {
        this.sourceTimestamp = sourceTimestamp;
    }

    public Instant getServerTimestamp() {
        return serverTimestamp;
    }

    public void setServerTimestamp(Instant serverTimestamp) {
        this.serverTimestamp = serverTimestamp;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }
}
