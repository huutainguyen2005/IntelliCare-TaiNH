package vn.edu.fpt.sba.intellicare.configs;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.core.MqttPahoClientFactory;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;
import vn.edu.fpt.sba.intellicare.dto.request.WeightHardwareDataDTO;
import vn.edu.fpt.sba.intellicare.services.IMeasurementSessionService;

@Configuration
public class MqttConfig {

    // Lấy URL từ file application.properties
    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    // ID của Backend khi kết nối vào Broker (phải là duy nhất)
    private static final String CLIENT_ID = "intellicare-spring-boot";

    // Topic mà Backend sẽ "trực" để nghe kết quả từ cái Cân gửi lên
    @Value("${mqtt.topic.result}")
    private String topicResult;

    // Cấu hình nhà máy tạo kết nối (Client Factory)
    @Bean
    public MqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setCleanSession(true);
        // Nếu sau này có username/password thì setup ở đây:
        // options.setUserName("admin");
        // options.setPassword("public".toCharArray());
        factory.setConnectionOptions(options);
        return factory;
    }

    // Tạo một cái "ống nước" (Channel) để dữ liệu chảy vào Spring Boot
    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    // Cấu hình cắm "ống nước" đó vào Topic của EMQX Broker
    @Bean
    public MessageProducer inbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(CLIENT_ID + "-inbound", mqttClientFactory(), topicResult);
        adapter.setAutoStartup(false);
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    // Nơi xử lý dữ liệu (In ra Console) khi có tin nhắn bay vào "ống nước"
    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler handler(
            IMeasurementSessionService measurementService,
            ObjectMapper objectMapper) {
        return message -> {
            String topic = message.getHeaders().get("mqtt_receivedTopic").toString();
            String payload = message.getPayload().toString();

            System.out.println("=================================================");
            System.out.println("ĐÃ NHẬN DỮ LIỆU TỪ IoT THÀNH CÔNG!");
            System.out.println("Topic: " + topic);
            System.out.println("Payload: " + payload);

            try {
                // Phân tích cú pháp chuỗi JSON nhận từ MQTT thành Object DTO
                WeightHardwareDataDTO data =
                        objectMapper.readValue(payload, WeightHardwareDataDTO.class);

                // Gọi Service của bro để tự động bốc Patient, lưu WeightLog và đóng phiên đo
                measurementService.recordWeight(data.getDeviceId(), data.getWeightKg());

                System.out.println("[DATABASE] Đã lưu cân nặng thành công và đóng phiên đo!");

            } catch (Exception e) {
                System.err.println("Lỗi khi parse JSON hoặc lưu Database: " + e.getMessage());
            }
            System.out.println("=================================================");
        };
    }
}
