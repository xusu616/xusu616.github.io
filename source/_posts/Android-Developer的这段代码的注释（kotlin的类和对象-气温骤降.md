---
title: Android Developer的这段代码的注释（Kotlin的类和对象 - 气温骤降
tags:
  - Android
  - Kotlin
  - Android开发
date: 2026-03-18 12:11:00
cnblogs_url: https://i.cnblogs.com/posts/edit;postId=19735555
categories:
    - Android
    - Kotlin
---

这段代码感觉很清晰，可以理一下，看项目应该会看得更懂（？ package com.github.rd227.helloworld import kotlin.properties.ReadWriteProperty import kotlin.reflect.KProperty open class SmartDevice(val name: String, val category: String) { var deviceStatus = "online" protected set open val deviceType = "unknown" open fun turnOn()...
<!-- more -->

<blockquote>
<p>这段代码感觉很清晰，可以理一下，看项目<sub>应该</sub>会看得更懂（？</p>
</blockquote>
<p><img src="https://img2024.cnblogs.com/blog/3673875/202603/3673875-20260318200947705-48821173.png" alt="image" loading="lazy"></p>
```
package com.github.rd227.helloworld

import kotlin.properties.ReadWriteProperty
import kotlin.reflect.KProperty

open class SmartDevice(val name: String, val category: String) {

    var deviceStatus = "online"
        protected set

    open val deviceType = "unknown"

    open fun turnOn() {
        deviceStatus = "on"
    }

    open fun turnOff() {
        deviceStatus = "off"
    }
}

class SmartTvDevice(deviceName: String, deviceCategory: String) :
    SmartDevice(name = deviceName, category = deviceCategory) {

    override val deviceType = "Smart TV"

    private var speakerVolume by RangeRegulator(initialValue = 2, minValue = 0, maxValue = 100)

    private var channelNumber by RangeRegulator(initialValue = 1, minValue = 0, maxValue = 200)

    fun increaseSpeakerVolume() {
        speakerVolume++
        println("Speaker volume increased to $speakerVolume.")
    }

    fun nextChannel() {
        channelNumber++
        println("Channel number increased to $channelNumber.")
    }

    override fun turnOn() {
        super.turnOn()
        println(
            "$name is turned on. Speaker volume is set to $speakerVolume and channel number is " +
                "set to $channelNumber."
        )
    }

    override fun turnOff() {
        super.turnOff()
        println("$name turned off")
    }
}

class SmartLightDevice(deviceName: String, deviceCategory: String) :
    SmartDevice(name = deviceName, category = deviceCategory) {

    override val deviceType = "Smart Light"

    private var brightnessLevel by RangeRegulator(initialValue = 0, minValue = 0, maxValue = 100)

    fun increaseBrightness() {
        brightnessLevel++
        println("Brightness increased to $brightnessLevel.")
    }

    override fun turnOn() {
        super.turnOn()
        brightnessLevel = 2
        println("$name turned on. The brightness level is $brightnessLevel.")
    }

    override fun turnOff() {
        super.turnOff()
        brightnessLevel = 0
        println("Smart Light turned off")
    }
}

class SmartHome(
    val smartTvDevice: SmartTvDevice,
    val smartLightDevice: SmartLightDevice
) {

    var deviceTurnOnCount = 0
        private set

    fun turnOnTv() {
        deviceTurnOnCount++
        smartTvDevice.turnOn()
    }

    fun turnOffTv() {
        deviceTurnOnCount--
        smartTvDevice.turnOff()
    }

    fun increaseTvVolume() {
        smartTvDevice.increaseSpeakerVolume()
    }

    fun changeTvChannelToNext() {
        smartTvDevice.nextChannel()
    }

    fun turnOnLight() {
        deviceTurnOnCount++
        smartLightDevice.turnOn()
    }

    fun turnOffLight() {
        deviceTurnOnCount--
        smartLightDevice.turnOff()
    }

    fun increaseLightBrightness() {
        smartLightDevice.increaseBrightness()
    }

    fun turnOffAllDevices() {
        turnOffTv()
        turnOffLight()
    }
}

class RangeRegulator(
    initialValue: Int,
    private val minValue: Int,
    private val maxValue: Int
) : ReadWriteProperty<Any?, Int> {

    var fieldData = initialValue

    override fun getValue(thisRef: Any?, property: KProperty<*>): Int {
        return fieldData// property 可以获取属性的元数据（名字、类型等）//这里没用到
    }
/*
*
*
*    override fun setValue(thisRef: Any?, property: KProperty<*>, value: Int) {
        if (value in minValue..maxValue) {
            fieldData = value
        } else {
            // 用反射打印警告日志，包含属性名
            val className = thisRef?.javaClass?.simpleName ?: "Unknown"
            println("⚠️ [$className] 属性 '${property.name}' 赋值失败: $value 不在 [$minValue, $maxValue]")
        }//例如像这样反射访问，相当于把这个属性传进来，获取这个属性就是反射
    }
}
*
*
*/
    override fun setValue(thisRef: Any?, property: KProperty<*>, value: Int) {
        if (value in minValue..maxValue) {
            fieldData = value// property 可以获取属性的元数据（名字、类型等）
        }
    }
}

fun main() {
    var smartDevice: SmartDevice = SmartTvDevice("Android TV", "Entertainment")
    smartDevice.turnOn()

    smartDevice = SmartLightDevice("Google Light", "Utility")
    smartDevice.turnOn()
}
```
<p>1.反射<br>
2.类的继承调用</p>
