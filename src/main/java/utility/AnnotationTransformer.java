package utility;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;

import org.testng.IAnnotationTransformer;
import org.testng.annotations.ITestAnnotation;

public class AnnotationTransformer implements IAnnotationTransformer {

	@Override
	public void transform(ITestAnnotation annotation, Class testClass, Constructor testConstructor, Method testMethod) {
		annotation.setRetryAnalyzer(Retry.class);
	}
//	
//	   IRetryAnalyzer analyzer = arg0.getRetryAnalyzer();
//
//	    if (analyzer == null)   {
//	        arg0.setRetryAnalyzer(Retry.class);
//	    }
}
