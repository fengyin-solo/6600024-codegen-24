package com.opcua.model;

import java.util.List;

/**
 * OPC-UA 节点模型
 */
public class NodeModel {

    private String id;
    private String name;
    private String nodeId;
    private String type;        // Object, Variable, Method, DataType
    private String dataType;    // Double, Int32, Boolean, String
    private Object value;
    private String quality;     // Good, Bad, Uncertain
    private String unit;
    private String description;
    private String browseName;
    private List<NodeModel> children;

    public NodeModel() {
    }

    public NodeModel(String id, String name, String nodeId, String type, String dataType, Object value, String quality) {
        this.id = id;
        this.name = name;
        this.nodeId = nodeId;
        this.type = type;
        this.dataType = dataType;
        this.value = value;
        this.quality = quality;
    }

    // Getters and Setters

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDataType() {
        return dataType;
    }

    public void setDataType(String dataType) {
        this.dataType = dataType;
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

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getBrowseName() {
        return browseName;
    }

    public void setBrowseName(String browseName) {
        this.browseName = browseName;
    }

    public List<NodeModel> getChildren() {
        return children;
    }

    public void setChildren(List<NodeModel> children) {
        this.children = children;
    }
}
